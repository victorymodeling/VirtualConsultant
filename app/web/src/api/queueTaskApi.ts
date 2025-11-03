import { emptySplitApi as api } from "./emptyApi.ts";
export const addTagTypes = ["QueueTask"] as const;
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
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as queueTaskApi };
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
export const {
  usePostApiQueueTaskInsightsMutation,
  usePostApiQueueTaskMemoMutation,
  usePostApiQueueTaskSlidesMutation,
  usePostApiQueueTaskSurveyDataMutation,
  usePostApiQueueTaskFactCheckMutation,
} = injectedRtkApi;
