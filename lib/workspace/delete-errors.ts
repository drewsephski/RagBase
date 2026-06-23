export class WorkspaceDeleteError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 409, code = "active_subscription") {
    super(message);
    this.name = "WorkspaceDeleteError";
    this.status = status;
    this.code = code;
  }
}
