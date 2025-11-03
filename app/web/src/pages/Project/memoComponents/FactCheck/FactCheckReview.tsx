// FactCheckReview.tsx
import * as React from 'react';
import {
    Box,
    Stack,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Skeleton,
    IconButton,
    Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useAppSelector } from '../../../../store/hooks';
import {
    useGetApiTasksQuery,
    type TaskListItemDto,
} from '../../../../api/tasksApi';
import FactCheckOverview from "./FactCheckOverview.tsx";

function formatDateTime(iso?: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function FactCheckReview() {
    const projectId = useAppSelector((s) => s.selected.projectId);

    // Completed FactCheck tasks for this project
    const tasksQuery = useGetApiTasksQuery(
        {
            projectId: projectId as number,
            status: 'Succeeded',
            type: 'FactCheck',
            page: 1,
            pageSize: 100,
            sort: 'completedAt desc', // ask for server-side sort too
        },
        { skip: projectId == null }
    );

    // Normalize + client-side sort (defensive)
    const items: TaskListItemDto[] = React.useMemo(() => {
        const arr = tasksQuery.data?.items ?? [];
        return [...arr].sort((a, b) => {
            const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return tb - ta; // desc
        });
    }, [tasksQuery.data?.items]);

    // Selected task
    const [selectedTaskId, setSelectedTaskId] = React.useState<number | ''>('');

    // When items change, default to the most recent
    React.useEffect(() => {
        if (items.length > 0) {
            setSelectedTaskId(items[0].id ?? '');
        } else {
            setSelectedTaskId('');
        }
    }, [items]);

    const onRefresh = () => tasksQuery.refetch();

    const loading = tasksQuery.isLoading;
    const fetching = tasksQuery.isFetching;

    return (
        <Stack spacing={2}>
            {/* Header / Controls */}
            <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Review completed Fact Checks
                </Typography>

                <Tooltip title="Refresh completed tasks">
          <span>
            <IconButton onClick={onRefresh} disabled={fetching || projectId == null}>
              <RefreshIcon />
            </IconButton>
          </span>
                </Tooltip>
            </Stack>

            {/* Selector */}
            {projectId == null ? (
                <Typography variant="body2" color="text.secondary">
                    No project selected.
                </Typography>
            ) : loading ? (
                <Skeleton variant="rectangular" height={48} />
            ) : items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No completed Fact Check tasks yet.
                </Typography>
            ) : (
                <FormControl size="small" sx={{ maxWidth: 420 }}>
                    <InputLabel id="fc-completed-select-label">Completed task</InputLabel>
                    <Select
                        labelId="fc-completed-select-label"
                        id="fc-completed-select"
                        label="Completed task"
                        value={selectedTaskId}
                        onChange={(e) => setSelectedTaskId(e.target.value as number)}
                    >
                        {items.map((t) => (
                            <MenuItem key={t.id} value={t.id!}>
                                {/* show Completed At first, as requested */}
                                {formatDateTime(t.completedAt)} — Task #{t.id}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {/* Placeholder where the selected task’s details/results will go next */}
            {selectedTaskId !== '' && (
                <Box
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                >
                    {selectedTaskId && <FactCheckOverview taskId={selectedTaskId} />}
                </Box>
            )}
        </Stack>
    );
}
