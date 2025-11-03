// FactCheckExpander.tsx
import * as React from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Stack,
    Tabs,
    Tab,
    Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FactCheckPanel from './FactCheckPanel';
import FactCheckReview from './FactCheckReview';

export default function FactCheckExpander() {
    const [tab, setTab] = React.useState<'start' | 'review'>('start');

    return (
        <Accordion TransitionProps={{ unmountOnExit: true }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="subtitle1">Fact Check</Typography>
                </Stack>
            </AccordionSummary>

            <AccordionDetails>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        aria-label="Fact Check tabs"
                    >
                        <Tab label="Start new" value="start" />
                        <Tab label="Review" value="review" />
                    </Tabs>
                </Box>

                {tab === 'start' ? <FactCheckPanel /> : <FactCheckReview />}
            </AccordionDetails>
        </Accordion>
    );
}
