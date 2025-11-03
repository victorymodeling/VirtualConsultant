using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using api.Data;
using api.Dtos;
using api.Messaging.Abstractions;
using api.Messaging.IntegrationEvents;
using api.Models;

namespace api.Controllers;

[Route("api/QueueTask")]
[ApiController]
[Authorize]
public class QueueTaskController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITaskEventPublisher _publisher;

    private static readonly JsonSerializerOptions SnakeJson = new()
    {
        PropertyNamingPolicy = null,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public QueueTaskController(AppDbContext db, ITaskEventPublisher publisher)
    {
        _db = db;
        _publisher = publisher;
    }

    // POST api/QueueTask/insights
    [HttpPost("insights")]
    public async Task<IActionResult> QueueInsights(
        [FromBody] QueueCreateInsightsTaskDto dto,
        CancellationToken ct)
    {
        // Latest Focus prompt (or null if none)
        var focusPrompt = await _db.SystemPrompts
            .Where(sp => sp.PromptType == TaskJobType.Focus)
            .OrderByDescending(sp => sp.CreatedAt)
            .Select(sp => sp.Prompt)
            .FirstOrDefaultAsync(ct);

        // Latest Insights prompt (or null if none)
        var insightsPrompt = await _db.SystemPrompts
            .Where(sp => sp.PromptType == TaskJobType.Insights)
            .OrderByDescending(sp => sp.CreatedAt)
            .Select(sp => sp.Prompt)
            .FirstOrDefaultAsync(ct);

        return await CreateAndPublishAsync(
            dto.ProjectId,
            TaskJobType.Insights,
            (task, proj) => new
            {
                task_id = task.Id,
                project_id = proj.Id,
                project_context = proj.ProjectContext,
                kbid = proj.KbId,
                key_number = proj.KeyNumber,
                number_of_insights = dto.NumberOfInsights,
                focus = string.IsNullOrWhiteSpace(dto.Focus) ? null : dto.Focus,
                focus_agent_prompt = focusPrompt,
                insight_agent_prompt = insightsPrompt
            });
    }

    // POST api/QueueTask/memo
    [HttpPost("memo")]
    public async Task<IActionResult> QueueMemo([FromBody] QueueCreateMemoTaskDto dto, CancellationToken ct)
    {
        // 1) Load memo
        var memo = await _db.Memos
            .AsNoTracking()
            .Where(m => m.Id == dto.MemoId)
            .Select(m => new { m.Id, m.ProjectId, m.DocId })
            .SingleOrDefaultAsync(ct);

        if (memo is null)
            return NotFound($"Memo {dto.MemoId} not found.");

        if (string.IsNullOrWhiteSpace(memo.DocId))
            return BadRequest($"Memo {dto.MemoId} has no doc id.");

        // 2) Load project
        var proj = await _db.Projects
            .AsNoTracking()
            .Where(p => p.Id == memo.ProjectId)
            .Select(p => new ProjectShape
            {
                Id = p.Id,
                KbId = p.Kbid,
                KeyNumber = 0, // explicitly defaulted
                ProjectContext = p.ProjectContext
            })
            .SingleOrDefaultAsync(ct);

        if (proj is null)
            return NotFound($"Project {memo.ProjectId} not found.");

        // 3) Load insights
        var insights = await _db.Insights
            .AsNoTracking()
            .Where(i => i.ProjectId == proj.Id)
            .OrderBy(i => i.OrderIndex)
            .Select(i => i.Content)
            .ToListAsync(ct);

        if (insights.Count == 0)
            return BadRequest($"Project {proj.Id} has no insights.");

        // 3.5) Load latest system prompts (null if none found)
        var textBlockAgentPrompt = await _db.SystemPrompts
            .Where(sp => sp.PromptType == TaskJobType.MemoBlock)
            .OrderByDescending(sp => sp.CreatedAt)
            .Select(sp => sp.Prompt)
            .FirstOrDefaultAsync(ct);

        var memoAgentPrompt = await _db.SystemPrompts
            .Where(sp => sp.PromptType == TaskJobType.Memo)
            .OrderByDescending(sp => sp.CreatedAt)
            .Select(sp => sp.Prompt)
            .FirstOrDefaultAsync(ct);

        // 4–8) Shared flow: create task, build payload, save, publish, return
        return await CreateAndPublishAsync(
            proj.Id,
            TaskJobType.Memo,
            (task, _) => new
            {
                task_id = task.Id,
                project_id = proj.Id,
                project_context = proj.ProjectContext,
                kbid = proj.KbId,
                key_number = 0,
                memo_id = memo.Id,
                doc_id = memo.DocId,
                insights = insights,
                focus = dto.Focus,
                text_block_agent_prompt = textBlockAgentPrompt,
                memo_agent_prompt = memoAgentPrompt
            });
    }

    // POST api/QueueTask/slides
    // POST api/QueueTask/slides
[HttpPost("slides")]
public async Task<IActionResult> QueueSlides([FromBody] QueueCreateSlidesTaskDto dto)
{
    // 1) Load slide deck (must exist; gives us project, sheets_id, slides_id)
    var deck = await _db.Slidedecks
        .AsNoTracking()
        .Where(s => s.Id == dto.SlidedeckId)
        .Select(s => new
        {
            s.Id,
            s.ProjectId,
            s.SheetsId,
            s.PresentationId
        })
        .SingleOrDefaultAsync();

    if (deck is null)
        return NotFound($"Slide deck {dto.SlidedeckId} not found.");

    // 2) Load project attached to the slide deck (provides kbid; key_number = 0)
    var proj = await _db.Projects
        .AsNoTracking()
        .Where(p => p.Id == deck.ProjectId)
        .Select(p => new ProjectShape
        {
            Id = p.Id,
            KbId = p.Kbid,
            KeyNumber = 0,
            ProjectContext = p.ProjectContext
        })
        .SingleOrDefaultAsync();

    if (proj is null)
        return NotFound($"Project {deck.ProjectId} not found.");

    // 3) Load memo to obtain doc_id
    var memo = await _db.Memos
        .AsNoTracking()
        .Where(m => m.Id == dto.MemoId)
        .Select(m => new { m.Id, m.ProjectId, m.DocId })
        .SingleOrDefaultAsync();

    if (memo is null)
        return NotFound($"Memo {dto.MemoId} not found.");

    if (string.IsNullOrWhiteSpace(memo.DocId))
        return BadRequest($"Memo {dto.MemoId} has no doc id.");

    // Optional guard: ensure memo belongs to the same project as the deck
    if (memo.ProjectId != proj.Id)
        return BadRequest($"Memo {memo.Id} does not belong to project {proj.Id}.");

    // 3.5) Load latest system prompts (null if none found)
    var slideAgentPrompt = await _db.SystemPrompts
        .AsNoTracking()
        .Where(sp => sp.PromptType == TaskJobType.Slides)
        .OrderByDescending(sp => sp.CreatedAt)
        .Select(sp => sp.Prompt)
        .FirstOrDefaultAsync();

    var slideOutlineAgentPrompt = await _db.SystemPrompts
        .AsNoTracking()
        .Where(sp => sp.PromptType == TaskJobType.SlideOutline)
        .OrderByDescending(sp => sp.CreatedAt)
        .Select(sp => sp.Prompt)
        .FirstOrDefaultAsync();

    // 4) Shared flow: create task, build payload, save, publish, return
    return await CreateAndPublishAsync(
        proj.Id,
        TaskJobType.Slides,
        (task, _) => new
        {
            task_id = task.Id,
            project_id = proj.Id,
            project_context = proj.ProjectContext,
            kbid = proj.KbId,
            key_number = 0,                 // per spec
            slidedeck_id = deck.Id,         // from request
            doc_id = memo.DocId,            // from memo
            sheets_id = deck.SheetsId,      // from slide deck
            presentation_id = deck.PresentationId, // from slide deck
            focus = dto.Focus,

            // NEW fields
            slide_agent_prompt = slideAgentPrompt,                   // from Slides system prompt
            slide_outline_agent_prompt = slideOutlineAgentPrompt     // from SlideOutline system prompt
        });
}

    // POST api/QueueTask/survey-data
    [HttpPost("survey-data")]
    public async Task<IActionResult> QueueSurveyData([FromBody] QueueCreateSurveyDataTaskDto dto)
        => await CreateAndPublishAsync(
            dto.ProjectId,
            TaskJobType.SurveyData,
            (task, proj) => new
            {
                task_id = task.Id,
                project_id = proj.Id,
                kbid = proj.KbId,
                key_number = proj.KeyNumber
            });

    [HttpPost("fact-check")]
    public async Task<IActionResult> QueueFactCheck(
        [FromBody] QueueCreateFactCheckTaskDto dto,
        CancellationToken ct)
    {
        // 1) Load memo (must exist; provides project_id + doc_id)
        var memo = await _db.Memos
            .AsNoTracking()
            .Where(m => m.Id == dto.MemoId)
            .Select(m => new { m.Id, m.ProjectId, m.DocId })
            .SingleOrDefaultAsync(ct);

        if (memo is null)
            return NotFound($"Memo {dto.MemoId} not found.");

        if (string.IsNullOrWhiteSpace(memo.DocId))
            return BadRequest($"Memo {dto.MemoId} has no doc id.");

        // 2) Load project (provides kbid; key_number = 0)
        var proj = await _db.Projects
            .AsNoTracking()
            .Where(p => p.Id == memo.ProjectId)
            .Select(p => new ProjectShape
            {
                Id = p.Id,
                KbId = p.Kbid,
                KeyNumber = 0,
                ProjectContext = p.ProjectContext
            })
            .SingleOrDefaultAsync(ct);

        if (proj is null)
            return NotFound($"Project {memo.ProjectId} not found.");

        // 3) Shared flow: create task, build payload, save, publish, return
        return await CreateAndPublishAsync(
            proj.Id,
            TaskJobType.FactCheck,
            (task, _) => new
            {
                task_id = task.Id,
                project_id = proj.Id,
                kbid = proj.KbId,
                key_number = 0,
                memo_id = memo.Id,
                doc_id = memo.DocId
            });
    }
    
    // ---- Shared flow -------------------------------------------------------

    private async Task<IActionResult> CreateAndPublishAsync<TPayload>(
        int projectId,
        TaskJobType jobType,
        Func<TaskJob, ProjectShape, TPayload> payloadFactory)
    {
        // 1) Load project & required props (adjust names if yours differ)
        var proj = await _db.Projects
            .AsNoTracking()
            .Where(p => p.Id == projectId)
            .Select(p => new ProjectShape
            {
                Id = p.Id,
                KbId = p.Kbid,
                KeyNumber = 0,
                ProjectContext = p.ProjectContext
            })
            .SingleOrDefaultAsync();

        if (proj is null)
            return NotFound($"Project {projectId} not found.");

        // 2) Resolve user from auth
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(idClaim, out var userId))
            return BadRequest("Authenticated user required (no numeric user id claim found).");

        // 3) Create TaskJob and save to get Id
        var task = new TaskJob
        {
            ProjectId = projectId,
            CreatedByUserId = userId,
            JobType = jobType,
            JobStatus = TaskJobStatus.Queued,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync(); // assigns task.Id

        // 4) Build payload matching worker schema (snake_case, no extras)
        var payloadObj = payloadFactory(task, proj);
        task.PayloadJson = JsonSerializer.Serialize(payloadObj, SnakeJson);

        _db.Tasks.Update(task);
        await _db.SaveChangesAsync();

        // 5) Publish integration event
        var evt = new TaskCreatedEvent(
            TaskId: task.Id,
            ProjectId: task.ProjectId,
            CreatedByUserId: task.CreatedByUserId,
            JobType: task.JobType,
            PayloadJson: task.PayloadJson,
            CreatedAt: task.CreatedAt
        );

        await _publisher.PublishAsync(jobType, task.PayloadJson, HttpContext.RequestAborted);

        // 6) 202 Accepted + poll URL
        var pollUrl = Url.Action("GetTask", "Tasks", new { id = task.Id }, Request.Scheme) ?? $"/api/tasks/{task.Id}";
        return Accepted(pollUrl, new
        {
            task.Id,
            task.ProjectId,
            Status = task.JobStatus.ToString(),
            Poll = pollUrl
        });
    }

    private sealed class ProjectShape
    {
        public int Id { get; set; }
        public string KbId { get; set; } = null!;
        public int KeyNumber { get; set; }
        public string? ProjectContext { get; set; }
    }
}
