using System.Text.Json;

namespace api.Models;

public enum TaskJobType
{
    Insights    = 0, // task.insights
    FullReport  = 1, // task.full_report
    Memo        = 2, // task.memo
    Slides      = 3, // task.slides 
    SurveyData  = 4,  // task.survey_data
    MemoBlock = 5,
    SlideOutline = 6,
    Focus = 7,
    FactCheck = 8
}

public enum TaskJobStatus
{
    Queued = 0,
    Running = 1,
    Succeeded = 2,
    Failed = 3,
    Canceled = 4
}

public class TaskJob
{
    public int Id { get; set; }

    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    // User relationship
    public int CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    public TaskJobType JobType { get; set; }
    public TaskJobStatus JobStatus { get; set; } = TaskJobStatus.Queued;

    public int? Progress { get; set; }

    public string PayloadJson { get; set; } = "{}";
    public string? ErrorMessage { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public List<TaskArtifact> Artifacts { get; set; } = new();
}


public enum TaskArtifactResourceType
{
    Insight   = 0,
    Memo      = 1,
    Slidedeck = 2,
    SurveyData = 3,
    FactCheck = 4
}

public enum TaskArtifactActionType
{
    Create   = 0,
    Edit      = 1
}

public class TaskArtifact
{
    public int Id { get; set; }

    public int TaskId { get; set; }
    public TaskJob Task { get; set; } = null!;

    public TaskArtifactResourceType ResourceType { get; set; }   // now enum
    public int? CreatedResourceId { get; set; }

    public TaskArtifactActionType Action { get; set; } = TaskArtifactActionType.Create;
    
    public int? TotalTokens { get; set; }
    
    public JsonDocument? Payload { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

