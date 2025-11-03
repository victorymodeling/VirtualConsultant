import { emptySplitApi as api } from "./emptyApi.ts";
export const addTagTypes = ["SystemPrompts"] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getApiSystemPrompts: build.query<
        GetApiSystemPromptsApiResponse,
        GetApiSystemPromptsApiArg
      >({
        query: (queryArg) => ({
          url: `/api/SystemPrompts`,
          params: {
            type: queryArg["type"],
            latestOnly: queryArg.latestOnly,
            page: queryArg.page,
            pageSize: queryArg.pageSize,
          },
        }),
        providesTags: ["SystemPrompts"],
      }),
      postApiSystemPrompts: build.mutation<
        PostApiSystemPromptsApiResponse,
        PostApiSystemPromptsApiArg
      >({
        query: (queryArg) => ({
          url: `/api/SystemPrompts`,
          method: "POST",
          body: queryArg.createSystemPromptDto,
        }),
        invalidatesTags: ["SystemPrompts"],
      }),
      getApiSystemPromptsById: build.query<
        GetApiSystemPromptsByIdApiResponse,
        GetApiSystemPromptsByIdApiArg
      >({
        query: (queryArg) => ({ url: `/api/SystemPrompts/${queryArg.id}` }),
        providesTags: ["SystemPrompts"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as systemPromptsApi };
export type GetApiSystemPromptsApiResponse =
  /** status 200 OK */ SystemPromptListItemDtoPagedResultDto;
export type GetApiSystemPromptsApiArg = {
  type?: TaskJobType;
  latestOnly?: boolean;
  page?: number;
  pageSize?: number;
};
export type PostApiSystemPromptsApiResponse =
  /** status 200 OK */ SystemPromptDetailDto;
export type PostApiSystemPromptsApiArg = {
  createSystemPromptDto: CreateSystemPromptDto;
};
export type GetApiSystemPromptsByIdApiResponse =
  /** status 200 OK */ SystemPromptDetailDto;
export type GetApiSystemPromptsByIdApiArg = {
  id: number;
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
export type SystemPromptListItemDto = {
  id?: number;
  promptType?: TaskJobType;
  prompt?: string | null;
  createdAt?: string;
};
export type SystemPromptListItemDtoPagedResultDto = {
  items?: SystemPromptListItemDto[] | null;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
};
export type SystemPromptDetailDto = {
  id?: number;
  promptType?: TaskJobType;
  prompt?: string | null;
  createdAt?: string;
};
export type CreateSystemPromptDto = {
  promptType?: TaskJobType;
  prompt?: string | null;
};
export const {
  useGetApiSystemPromptsQuery,
  usePostApiSystemPromptsMutation,
  useGetApiSystemPromptsByIdQuery,
} = injectedRtkApi;
