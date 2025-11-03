// FactCheckPanel.tsx
import * as React from 'react';
import {
    Stack,
    Button,
    Typography,
    Skeleton,
    IconButton,
    Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useAppDispatch, useAppSelector } from '../../../../store/hooks';

// POST: /api/QueueTask/fact-check
import { usePostApiQueueTaskFactCheckMutation } from '../../../../api/queueTaskApi';

// GET: /api/Tasks (filtered to project + FactCheck)
import {
    useGetApiTasksQuery,
    tasksApi,
    type TaskListItemDto,
} from '../../../../api/tasksApi';

import TaskStatusPoller from '../../../../components/TaskStatusPoller';

export default function FactCheckPanel() {
    const dispatch = useAppDispatch();

    const memoId = useAppSelector((s) => s.selected.memoId);
    const projectId = useAppSelector((s) => s.selected.projectId);

    // --- Running FactCheck tasks for this project
    const running = useGetApiTasksQuery(
        {
            projectId: projectId as number,
            status: 'Running',
            type: 'FactCheck',
            page: 1,
            pageSize: 100,
            sort: 'createdAt desc',
        },
        { skip: projectId == null }
    );

    // --- Queued FactCheck tasks for this project
    const queued = useGetApiTasksQuery(
        {
            projectId: projectId as number,
            status: 'Queued',
            type: 'FactCheck',
            page: 1,
            pageSize: 100,
            sort: 'createdAt desc',
        },
        { skip: projectId == null }
    );

    // rows like the Project Overview page (Running first, then Queued)
    const rows: TaskListItemDto[] = [
        ...(running.data?.items ?? []),
        ...(queued.data?.items ?? []),
    ];

    const anyTasksLoading = running.isLoading || queued.isLoading;
    const anyTasksFetching = running.isFetching || queued.isFetching;

    const refreshTasks = () => {
        running.refetch();
        queued.refetch();
    };

    const [launchFactCheck, { isLoading: isLaunching }] =
        usePostApiQueueTaskFactCheckMutation();

    const handleLaunch = React.useCallback(async () => {
        if (!memoId) return;
        try {
            await launchFactCheck({
                queueCreateFactCheckTaskDto: { memoId },
            }).unwrap();

            // Invalidate and refetch task lists so the new task appears
            dispatch(tasksApi.util.invalidateTags(['Tasks']));
            refreshTasks();
        } catch {
            // hook up to your toast/logger if desired
        }
    }, [dispatch, launchFactCheck, memoId]);

    return (
        <Stack spacing={2}>
            {/* Actions */}
            <Stack direction="row" spacing={1} alignItems="center">
                <Button
                    variant="contained"
                    onClick={handleLaunch}
                    disabled={!memoId || isLaunching}
                >
                    {isLaunching ? 'Launching…' : 'Launch Fact Check'}
                </Button>

                <Tooltip title="Refresh Fact Check tasks">
          <span>
            <IconButton
                onClick={refreshTasks}
                disabled={anyTasksFetching || projectId == null}
            >
              <RefreshIcon />
            </IconButton>
          </span>
                </Tooltip>
            </Stack>

            {/* Active Fact Check tasks */}
            <Stack spacing={1.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Active Fact Check Tasks
                </Typography>

                {projectId == null ? (
                    <Typography variant="body2" color="text.secondary">
                        No project selected.
                    </Typography>
                ) : anyTasksLoading ? (
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        <Skeleton variant="rectangular" height={56} />
                        <Skeleton variant="rectangular" height={56} />
                    </Stack>
                ) : rows.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No active Fact Check tasks right now.
                    </Typography>
                ) : (
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        {rows.map((t) => (
                            <TaskStatusPoller
                                key={t.id}
                                taskId={t.id!}
                                title={
                                    t.status === 'Running'
                                        ? `Running ${t.jobType} Task`
                                        : `Queued ${t.jobType} Task`
                                }
                                pollIntervalMs={2000}
                                hideWhenSucceeded={false}
                            />
                        ))}
                    </Stack>
                )}

                {(running.data?.items?.length ?? 0) + (queued.data?.items?.length ?? 0) >
                    0 && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, display: 'block' }}
                        >
                            {(running.data?.items?.length ?? 0)} running •{' '}
                            {(queued.data?.items?.length ?? 0)} queued
                        </Typography>
                    )}
            </Stack>
        </Stack>
    );
}
