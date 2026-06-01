export {};

type UpdateState =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "unavailable"
  | "error";

type UpdateStatus = {
  state: UpdateState;
  updateAvailable: boolean;
  version: string | null;
  progress?: number;
  error: string | null;
};

declare global {
  interface Window {
    api?: {
      ping: () => string;
      updates?: {
        getStatus: () => Promise<UpdateStatus>;
        check: () => Promise<UpdateStatus>;
        install: () => Promise<UpdateStatus>;
        onStatus: (callback: (status: UpdateStatus) => void) => () => void;
      };
    };
  }
}
