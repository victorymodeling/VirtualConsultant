// FactCheckArtifact.tsx
import {
    Box,
    Chip,
    Paper,
    Stack,
    Typography,
    Divider,
} from '@mui/material';

export default function FactCheckArtifact({
                                              claim,
                                              supportingQuestions,
                                              isFactual,
                                              correction,
                                          }: {
    claim: string;
    supportingQuestions: string[];
    isFactual: boolean;
    correction: string;
}) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 2,
                overflow: 'hidden',
            }}
        >
            <Stack spacing={1.25}>
                {/* Claim header row */}
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Claim
                    </Typography>
                    <Chip
                        label={isFactual ? 'Factual' : 'False'}
                        size="small"
                        color={isFactual ? 'success' : 'error'}
                        variant={isFactual ? 'outlined' : 'filled'}
                        sx={{ ml: 0.5 }}
                    />
                </Stack>

                {/* Claim body as quote */}
                <Box
                    sx={{
                        borderLeft: (t) => `3px solid ${t.palette.divider}`,
                        pl: 1.5,
                    }}
                >
                    <Typography variant="body1">{claim}</Typography>
                </Box>

                {/* Supporting questions */}
                {supportingQuestions?.length > 0 && (
                    <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                            Supporting questions
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {supportingQuestions.map((q, i) => (
                                <Chip key={i} label={q} size="small" variant="outlined" />
                            ))}
                        </Stack>
                    </Stack>
                )}

                <Divider />

                {/* Correction */}
                <Stack spacing={0.75}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Correction
                    </Typography>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: (t) =>
                                isFactual ? t.palette.action.hover : t.palette.error.light + '22',
                            border: (t) =>
                                `1px solid ${
                                    isFactual ? t.palette.divider : t.palette.error.light
                                }`,
                        }}
                    >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {correction}
                        </Typography>
                    </Box>
                </Stack>
            </Stack>
        </Paper>
    );
}
