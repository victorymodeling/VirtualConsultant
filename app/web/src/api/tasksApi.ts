import { emptySplitApi as api } from "./emptyApi.ts";
export const addTagTypes = ["QueueTask", "Tasks"] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      postApiQueueTaskInsights: build.mutation<
        PostApiQueueTaskInsightsApiResponse,
        PostApiQueueTaskInsightsApiArg
      >({
        query: (queryArg) => ({
          url: `/api/QueueTask/insights`,
          method: "POST",
          body: queryArg.queueCreateInsightsTaskDto,
        }),
        invalidatesTags: ["QueueTask"],
      }),
      postApiQueueTaskMemo: build.mutation<
        PostApiQueueTaskMemoApiResponse,
        PostApiQueueTaskMemoApiArg
      >({
        query: (queryArg) => ({
          url: `/api/QueueTask/memo`,
          method: "POST",
          body: queryArg.queueCreateMemoTaskDto,
        }),
        invalidatesTags: ["QueueTask"],
      }),
      postApiQueueTaskSlides: build.mutation<
        PostApiQueueTaskSlidesApiResponse,
        PostApiQueueTaskSlidesApiArg
      >({
        query: (queryArg) => ({
          url: `/api/QueueTask/slides`,
          method: "POST",
          body: queryArg.queueCreateSlidesTaskDto,
        }),
        invalidatesTags: ["QueueTask"],
      }),
      postApiQueueTaskSurveyData: build.mutation<
        PostApiQueueTaskSurveyDataApiResponse,
        PostApiQueueTaskSurveyDataApiArg
      >({
        query: (queryArg) => ({
          url: `/api/QueueTask/survey-data`,
          method: "POST",
          body: queryArg.queueCreateSurveyDataTaskDto,
        }),
        invalidatesTags: ["QueueTask"],
      }),
      postApiQueueTaskFactCheck: build.mutation<
        PostApiQueueTaskFactCheckApiResponse,
        PostApiQueueTaskFactCheckApiArg
      >({
        query: (queryArg) => ({
          url: `/api/QueueTask/fact-check`,
          method: "POST",
          body: queryArg.queueCreateFactCheckTaskDto,
        }),
        invalidatesTags: ["QueueTask"],
      }),
      getApiTasks: build.query<GetApiTasksApiResponse, GetApiTasksApiArg>({
        query: (queryArg) => ({
          url: `/api/Tasks`,
          params: {
            projectId: queryArg.projectId,
            createdByUserId: queryArg.createdByUserId,
            status: queryArg.status,
            type: queryArg["type"],
            createdAfter: queryArg.createdAfter,
            createdBefore: queryArg.createdBefore,
            memoId: queryArg.memoId,
            page: queryArg.page,
            pageSize: queryArg.pageSize,
            sort: queryArg.sort,
          },
        }),
        providesTags: ["Tasks"],
      }),
      postApiTasks: build.mutation<PostApiTasksApiResponse, PostApiTasksApiArg>(
        {
          query: (queryArg) => ({
            url: `/api/Tasks`,
            method: "POST",
            body: queryArg.createTaskDto,
          }),
          invalidatesTags: ["Tasks"],
        },
      ),
      getApiTasksById: build.query<
        GetApiTasksByIdApiResponse,
        GetApiTasksByIdApiArg
      >({
        query: (queryArg) => ({ url: `/api/Tasks/${queryArg.id}` }),
        providesTags: ["Tasks"],
      }),
      patchApiTasksById: build.mutation<
        PatchApiTasksByIdApiResponse,
        PatchApiTasksByIdApiArg
      >({
        query: (queryArg) => ({
          url: `/api/Tasks/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.updateTaskDto,
        }),
        invalidatesTags: ["Tasks"],
      }),
      deleteApiTasksById: build.mutation<
        DeleteApiTasksByIdApiResponse,
        DeleteApiTasksByIdApiArg
      >({
        query: (queryArg) => ({
          url: `/api/Tasks/${queryArg.id}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Tasks"],
      }),
      postApiTasksByIdArtifacts: build.mutation<
        PostApiTasksByIdArtifactsApiResponse,
        PostApiTasksByIdArtifactsApiArg
      >({
        query: (queryArg) => ({
          url: `/api/Tasks/${queryArg.id}/artifacts`,
          method: "POST",
          body: queryArg.createTaskArtifactDto,
        }),
        invalidatesTags: ["Tasks"],
      }),
      deleteApiTasksByIdArtifactsAndArtifactId: build.mutation<
        DeleteApiTasksByIdArtifactsAndArtifactIdApiResponse,
        DeleteApiTasksByIdArtifactsAndArtifactIdApiArg
      >({
        query: (queryArg) => ({
          url: `/api/Tasks/${queryArg.id}/artifacts/${queryArg.artifactId}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Tasks"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as tasksApi };
export type PostApiQueueTaskInsightsApiResponse = unknown;
export type PostApiQueueTaskInsightsApiArg = {
  queueCreateInsightsTaskDto: QueueCreateInsightsTaskDto;
};
export type PostApiQueueTaskMemoApiResponse = unknown;
export type PostApiQueueTaskMemoApiArg = {
  queueCreateMemoTaskDto: QueueCreateMemoTaskDto;
};
export type PostApiQueueTaskSlidesApiResponse = unknown;
export type PostApiQueueTaskSlidesApiArg = {
  queueCreateSlidesTaskDto: QueueCreateSlidesTaskDto;
};
export type PostApiQueueTaskSurveyDataApiResponse = unknown;
export type PostApiQueueTaskSurveyDataApiArg = {
  queueCreateSurveyDataTaskDto: QueueCreateSurveyDataTaskDto;
};
export type PostApiQueueTaskFactCheckApiResponse = unknown;
export type PostApiQueueTaskFactCheckApiArg = {
  queueCreateFactCheckTaskDto: QueueCreateFactCheckTaskDto;
};
export type GetApiTasksApiResponse =
  /** status 200 OK */ TaskListItemDtoPagedResultDto;
export type GetApiTasksApiArg = {
  projectId?: number;
  createdByUserId?: number;
  status?: TaskJobStatus;
  type?: TaskJobType;
  createdAfter?: string;
  createdBefore?: string;
  memoId?: number;
  page?: number;
  pageSize?: number;
  sort?: string;
};
export type PostApiTasksApiResponse = /** status 200 OK */ TaskDetailDto;
export type PostApiTasksApiArg = {
  createTaskDto: CreateTaskDto;
};
export type GetApiTasksByIdApiResponse = /** status 200 OK */ TaskDetailDto;
export type GetApiTasksByIdApiArg = {
  id: number;
};
export type PatchApiTasksByIdApiResponse = unknown;
export type PatchApiTasksByIdApiArg = {
  id: number;
  updateTaskDto: UpdateTaskDto;
};
export type DeleteApiTasksByIdApiResponse = unknown;
export type DeleteApiTasksByIdApiArg = {
  id: number;
};
export type PostApiTasksByIdArtifactsApiResponse =
  /** status 201 Created */ TaskArtifactDto;
export type PostApiTasksByIdArtifactsApiArg = {
  id: number;
  createTaskArtifactDto: CreateTaskArtifactDto;
};
export type DeleteApiTasksByIdArtifactsAndArtifactIdApiResponse = unknown;
export type DeleteApiTasksByIdArtifactsAndArtifactIdApiArg = {
  id: number;
  artifactId: number;
};
export type QueueCreateInsightsTaskDto = {
  projectId?: number;
  numberOfInsights?: number | null;
  focus?: string | null;
};
export type QueueCreateMemoTaskDto = {
  memoId?: number;
  focus?: string | null;
};
export type QueueCreateSlidesTaskDto = {
  slidedeckId: number;
  memoId: number;
  focus?: string | null;
};
export type QueueCreateSurveyDataTaskDto = {
  projectId?: number;
};
export type QueueCreateFactCheckTaskDto = {
  memoId?: number;
};
export type TaskJobType =
  | "Insights"
  | "FullReport"
  | "Memo"
  | "Slides"
  | "SurveyData"
  | "MemoBlock"
  | "SlideOutline"
  | "Focus"
  | "FactCheck";
export type TaskJobStatus =
  | "Queued"
  | "Running"
  | "Succeeded"
  | "Failed"
  | "Canceled";
export type TaskListItemDto = {
  id?: number;
  projectId?: number;
  jobType?: TaskJobType;
  status?: TaskJobStatus;
  progress?: number | null;
  createdByUserId?: number;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
};
export type TaskListItemDtoPagedResultDto = {
  items?: TaskListItemDto[] | null;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
};
export type TaskArtifactResourceType =
  | "Insight"
  | "Memo"
  | "Slidedeck"
  | "SurveyData"
  | "FactCheck";
export type TaskArtifactActionType = "Create" | "Edit";
export type TaskArtifactDto = {
  id?: number;
  taskId?: number;
  resourceType?: TaskArtifactResourceType;
  createdResourceId?: number | null;
  action?: TaskArtifactActionType;
  totalTokens?: number | null;
  createdAt?: string;
  payload?: any | null;
};
export type TaskDetailDto = {
  id?: number;
  projectId?: number;
  jobType?: TaskJobType;
  status?: TaskJobStatus;
  progress?: number | null;
  createdByUserId?: number;
  payloadJson?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  artifacts?: TaskArtifactDto[] | null;
};
export type CreateTaskDto = {
  projectId?: number;
  jobType?: TaskJobType;
  createdByUserId?: number;
  payloadJson?: string | null;
};
export type UpdateTaskDto = {
  type?: TaskJobType;
  status?: TaskJobStatus;
  progress?: number | null;
  payloadJson?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};
export type ProblemDetails = {
  type?: string | null;
  title?: string | null;
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
};
export type CreateTaskArtifactDto = {
  resourceType?: TaskArtifactResourceType;
  action?: TaskArtifactActionType;
  createdResourceId?: number | null;
  totalTokens?: number | null;
  payload?: any | null;
};
export const {
  usePostApiQueueTaskInsightsMutation,
  usePostApiQueueTaskMemoMutation,
  usePostApiQueueTaskSlidesMutation,
  usePostApiQueueTaskSurveyDataMutation,
  usePostApiQueueTaskFactCheckMutation,
  useGetApiTasksQuery,
  usePostApiTasksMutation,
  useGetApiTasksByIdQuery,
  usePatchApiTasksByIdMutation,
  useDeleteApiTasksByIdMutation,
  usePostApiTasksByIdArtifactsMutation,
  useDeleteApiTasksByIdArtifactsAndArtifactIdMutation,
} = injectedRtkApi;
