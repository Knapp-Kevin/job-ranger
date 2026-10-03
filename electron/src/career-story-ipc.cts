import { ipcMain } from "electron";
import { CareerStoryBackend } from "./career-story-backend.cjs";
import { validateCareerStoryInput } from "./career-story-validator.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";

export function initializeCareerStoryIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): void {
  const backend = new CareerStoryBackend(options);
  const ready = backend.initialize();

  ipcMain.handle("career-stories:list", async () => {
    await ready;
    return backend.listStories();
  });

  ipcMain.handle("career-stories:create", async (_event, input: unknown) => {
    await ready;
    return backend.createStory(validateCareerStoryInput(input));
  });

  ipcMain.handle(
    "career-stories:update",
    async (_event, storyId: string, input: unknown) => {
      await ready;
      return backend.updateStory(
        validateCareerEntityId(storyId, "Career Story id"),
        validateCareerStoryInput(input),
      );
    },
  );

  ipcMain.handle("career-stories:delete", async (_event, storyId: string) => {
    await ready;
    await backend.deleteStory(validateCareerEntityId(storyId, "Career Story id"));
  });
}
