export class ProRequiredError extends Error {
  status = 403;

  constructor(message = "RagBase Pro is required for this feature.") {
    super(message);
    this.name = "ProRequiredError";
  }
}
