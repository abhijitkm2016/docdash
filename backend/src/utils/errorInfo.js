/**
 * Flatten an error (and its `cause` chain) into a log-friendly object.
 *
 * Node's built-in fetch (undici) throws a bare `TypeError: fetch failed` and
 * hides the real reason — ENOTFOUND, ECONNREFUSED, ETIMEDOUT, a TLS error —
 * in `err.cause`. Logging only `err.message` throws that detail away.
 */
function describeError(err, step) {
  const info = {
    step,
    name:    err?.name,
    message: err?.message,
    status:  err?.status ?? err?.statusCode,
    code:    err?.code,
  };

  const causes = [];
  let cause = err?.cause;
  for (let depth = 0; cause && depth < 4; depth++) {
    causes.push({
      name:     cause.name,
      message:  cause.message,
      code:     cause.code,
      errno:    cause.errno,
      syscall:  cause.syscall,
      hostname: cause.hostname,
      address:  cause.address,
      port:     cause.port,
    });
    cause = cause.cause;
  }
  if (causes.length) info.causes = causes;

  return info;
}

module.exports = { describeError };
