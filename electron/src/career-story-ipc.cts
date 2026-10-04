import { ipcMain } from "electron";
import { CareerStoryBackend } from "./career-story-backend.cjs";
import { validateCareerStoryInput } from "./career-story-validator.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";

export async function initializeCareerStoryIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): Promise<void> {
  const backend = new CareerStoryBackend(options);
  await backend.initialize();

  ipcMain.handle("career-stories:list", () => backend.listStories());

  ipcMain.handle("career-stories:create", (_event, input: unknown) =>
    backend.createStory(validateCareerStoryInput(input)),
  );

  ipcMain.handle(
    "career-stories:update",
    (_event, storyId: string, input: unknown) =>
      backend.updateStory(
        validateCareerEntityId(storyId, "Career Story id"),
        validateCareerStoryInput(input),
      ),
  );

  ipcMain.handle("career-stories:delete", async (_event, storyId: string) => {
    await backend.deleteStory(validateCareerEntityId(storyId, "Career Story id"));
  });
}
