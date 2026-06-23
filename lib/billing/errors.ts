export class ProRequiredError extends Error {
  status: number;

  constructor(message = "RagBase Pro is required for this feature.") {
    super(message);
    this.name = "ProRequiredError";
    this.status = 403;
  }
}
