using System.ComponentModel.DataAnnotations;

namespace api.Dtos
{
    public class QueueCreateInsightsTaskDto
    {
        public int ProjectId { get; set; }

        // Optional integer between 0 and 5 (inclusive)
        [Range(0, 5, ErrorMessage = "number_of_insights must be between 0 and 5.")]
        public int? NumberOfInsights { get; set; }

        // Optional free-form focus string
        public string? Focus { get; set; }
    }

    public sealed class QueueCreateFactCheckTaskDto
    {
        public int MemoId { get; set; }
    }

    public class QueueCreateMemoTaskDto
    {
        public int MemoId { get; set; }
        public string? Focus { get; set; }
    }

    public class QueueCreateSlidesTaskDto
    {
        [Required]
        public int SlidedeckId { get; set; }
        [Required]
        public int MemoId { get; set; }
        public string? Focus { get; set; }
    }

    public class QueueCreateSurveyDataTaskDto
    {
        public int ProjectId { get; set; }
    }
}