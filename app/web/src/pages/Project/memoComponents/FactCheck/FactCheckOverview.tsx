// FactCheckOverview.tsx
import * as React from 'react';
import {
    Box,
    Stack,
    Typography,
    Skeleton,
    Paper,
    Switch,
    FormControlLabel,
    IconButton,
    Tooltip,
    Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useGetApiTasksByIdQuery } from '../../../../api/tasksApi';
import FactCheckArtifact from './FactCheckArtifact';

type ArtifactPayload = {
    claim: string;
    supporting_questions: string[];
    is_factual: boolean;
    correction: string;
};

export default function FactCheckOverview({ taskId }: { taskId: number }) {
    const { data, isLoading, isFetching, isError, error, refetch } =
        useGetApiTasksByIdQuery({ id: taskId }, { skip: taskId == null });

    const [falseOnly, setFalseOnly] = React.useState<boolean>(false);

    // Normalize artifacts safely
    const artifacts = React.useMemo(() => {
        if (!data?.artifacts) return [];

        return data.artifacts.map((a) => {
            let raw: any = {};
            try {
                raw = JSON.parse(a.payload ?? '{}');
            } catch {
                // fallback to empty
                raw = {};
            }

            const normalized: ArtifactPayload = {
                claim: typeof raw.claim === 'string' ? raw.claim : '',
                supporting_questions: Array.isArray(raw.supporting_questions)
                    ? raw.supporting_questions
                    : [],
                is_factual: typeof raw.is_factual === 'boolean' ? raw.is_factual : false,
                correction: typeof raw.correction === 'string' ? raw.correction : '',
            };

            return normalized;
        });
    }, [data?.artifacts]);

    const filtered = React.useMemo(
        () => (falseOnly ? artifacts.filter((a) => !a.is_factual) : artifacts),
        [artifacts, falseOnly]
    );

    if (isLoading) {
        return (
            <Stack spacing={1.5}>
                <Skeleton variant="rectangular" height={48} />
                <Skeleton variant="rectangular" height={100} />
                <Skeleton variant="rectangular" height={100} />
            </Stack>
        );
    }

    if (isError) {
        const msg =
            typeof error === 'object' && error && 'status' in (error as any)
                ? `Failed to load task (${(error as any).status}).`
                : 'Failed to load task.';
        return (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {msg}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Task ID: {taskId}
                </Typography>
                <Typography
                    role="button"
                    tabIndex={0}
                    onClick={() => refetch()}
                    sx={{ cursor: 'pointer', color: 'primary.main' }}
                >
                    Try again
                </Typography>
            </Paper>
        );
    }

    return (
        <Stack spacing={2}>
            {/* Controls */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <FormControlLabel
                    control={
                        <Switch
                            checked={falseOnly}
                            onChange={(e) => setFalseOnly(e.target.checked)}
                        />
                    }
                    label="False Claims only"
                />
                <Tooltip title="Refresh">
          <span>
            <IconButton onClick={refetch} disabled={isFetching}>
              <RefreshIcon />
            </IconButton>
          </span>
                </Tooltip>
            </Stack>

            <Typography variant="body2" color="text.secondary">
                Showing {filtered.length} of {artifacts.length} artifact
                {artifacts.length === 1 ? '' : 's'}
                {falseOnly ? ' (false claims only).' : '.'}
            </Typography>

            <Divider />

            {filtered.length === 0 ? (
                <Box
                    sx={{
                        p: 3,
                        border: (t) => `1px dashed ${t.palette.divider}`,
                        borderRadius: 2,
                        textAlign: 'center',
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="body2">
                        {falseOnly
                            ? 'No false claims found in this task.'
                            : 'No artifacts found for this task.'}
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={1.5}>
                    {filtered.map((p, idx) => (
                        <FactCheckArtifact
                            key={idx}
                            claim={p.claim}
                            supportingQuestions={p.supporting_questions}
                            isFactual={p.is_factual}
                            correction={p.correction}
                        />
                    ))}
                </Stack>
            )}
        </Stack>
    );
}
