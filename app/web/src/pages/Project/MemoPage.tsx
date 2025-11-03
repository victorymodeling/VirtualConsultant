// src/pages/MemoPage.tsx
import { useMemo, useState } from "react";
import {
    Box,
    Button,
    Container,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store";
import { setMemoId } from "../../store/selectedSlice";
import ProjectStepper from "./ProjectStepper";
import MemoSelector from "./memoComponents/MemoSelector";
import MemoCreator from "./memoComponents/MemoCreator";
import { useGetApiMemosByIdQuery } from "../../api/memosApi";
import { getDocsEditUrl } from '../../integrations/google/docsApi/documents';

// ⬇️ adjust this import to your actual file/name (“Dialogue” vs “Dialog”)
import GenerateMemoDialogue from "./memoComponents/GenerateMemoDialog.tsx";

// ⬇️ NEW: poller for background task status
import TaskStatusPoller from "../../components/TaskStatusPoller";
import GoogleDocExpander from "./memoComponents/GoogleDocExpander.tsx";
import FactCheckExpander from "./memoComponents/FactCheck";

export type MemoViewMode = "Selecting" | "Creating";

export default function MemoPage() {
    const dispatch = useDispatch();
    const projectId =
        useSelector((s: RootState) => s.selected.projectId) ?? null;
    const memoId = useSelector(
        (s: RootState) => s.selected.memoId as number | null
    );

    const [mode, setMode] = useState<MemoViewMode>("Selecting");
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);

    const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);

    const { data: currentMemo, isFetching } = useGetApiMemosByIdQuery(
        { id: memoId as number },
        { skip: memoId == null }
    );

    const currentName = useMemo(() => {
        if (memoId == null) return "—";
        if (isFetching) return "Loading...";
        return currentMemo?.name ?? String(memoId);
    }, [memoId, isFetching, currentMemo?.name]);

    const dialogTitle =
        mode === "Selecting" ? "Select a memo" : "Create a new memo";

    const openSelecting = () => {
        setMode("Selecting");
        setDialogOpen(true);
    };

    const openCreating = () => {
        setMode("Creating");
        setDialogOpen(true);
    };

    const closeDialog = () => setDialogOpen(false);

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            {/* Keep stepper alignment with Insights page */}
            <ProjectStepper active="memo" />

            <Box
                sx={{
                    p: { xs: 2, md: 3 },
                    mt: 2,
                    borderRadius: 3,
                    border: (t) => `1px solid ${t.palette.divider}`,
                    bgcolor: "background.paper",
                }}
            >
                {/* Header / actions */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    gap={1.5}
                    sx={{ mb: 2 }}
                >
                    <Typography variant="h6">Memos</Typography>

                    <Tooltip title="Generate a memo from your project context">
                        {/* Tooltip needs a focusable child even when disabled */}
                        <span>
              <Button
                  variant="outlined"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={() => setShowGenerateDialog(true)}
                  disabled={!projectId}
              >
                Generate Memo
              </Button>
            </span>
                    </Tooltip>
                </Stack>

                {/* Current memo summary + actions */}
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                    gap={1.5}
                    sx={{ mb: 1 }}
                >
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Currently selected memo:{" "}
                            {currentMemo?.docId ? (
                                <a
                                    href={getDocsEditUrl(currentMemo.docId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {currentName}
                                </a>
                            ) : (
                                currentName
                            )}
                        </Typography>
                    </Box>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Button variant="outlined" onClick={openSelecting}>
                            Select Memo
                        </Button>
                        <Button variant="contained" onClick={openCreating}>
                            Create New Memo
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            {/* Select/Create dialog (unchanged behavior, polished container above) */}
            <Dialog
                open={isDialogOpen}
                onClose={closeDialog}
                fullWidth
                maxWidth="md"
                aria-labelledby="memo-dialog-title"
                keepMounted
            >
                <DialogTitle id="memo-dialog-title">{dialogTitle}</DialogTitle>

                <DialogContent dividers>
                    {mode === "Selecting" && (
                        <MemoSelector
                            projectId={projectId}
                            memoId={memoId}
                            onSelect={(id) => {
                                dispatch(setMemoId(id));
                                closeDialog();
                            }}
                            showTitle={false}
                            showCurrent
                            variant="default"
                        />
                    )}

                    {mode === "Creating" && (
                        <MemoCreator
                            onSuccess={(newId: number | null) => {
                                if (newId != null) dispatch(setMemoId(newId));
                                closeDialog();
                            }}
                        />
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={closeDialog}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Generate memo dialog */}
            {showGenerateDialog && (
                <GenerateMemoDialogue
                    memoId={memoId ?? undefined}
                    onCancel={() => setShowGenerateDialog(false)}
                    onSuccess={(taskId: number) => {
                        setCurrentTaskId(taskId);
                        setShowGenerateDialog(false);
                    }}
                />
            )}

            {/* ⬇️ NEW: show the task status poller if a task is running */}
            {
                currentTaskId &&
                <Box sx={{ mt: 2 }}>
                    <TaskStatusPoller taskId={currentTaskId} key={currentTaskId}/>
                </Box>
            }
            {
                memoId &&
                <>
                    <Box sx={{ mt: 3 }}>
                        <GoogleDocExpander />
                    </Box>
                    <Box sx={{ mt: 3 }}>
                        <FactCheckExpander />
                    </Box>
                </>

            }
        </Container>
    );
}
