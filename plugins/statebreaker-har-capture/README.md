# StateBreaker HAR Capture

`statebreaker-har-capture` is an offline importer for minimal HAR 1.2 files. It parses a
HAR without network access, removes sensitive and transport-managed request headers, and
produces a deterministic StateBreaker `Workflow` with a linear dependency chain.

## Install and use

From the StateBreaker repository root:

```bash
python -m pip install -e plugins/statebreaker-har-capture
statebreaker workflow import recording.har --plugin har.capture --output workflow.json
statebreaker workflow validate workflow.json
```

The current vertical slice accepts `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` requests
without a request body. JSON, form, or any other non-empty HAR `postData` is intentionally
rejected. Static-resource filtering, recursive sensitive-data cleanup, and dynamic-variable
inference are not implemented yet.

## Options

Direct plugin callers may pass the only supported option:

```python
workflow = await HarCapturePlugin().capture(
    Path("recording.har"),
    {"state_probe_entry_indices": [1]},
)
```

Indices are zero-based positions in the original `log.entries` array. They must be unique,
non-negative, in range, and refer to a generated step. Selected steps use the `probe` role
and are listed in `state_probe_steps`.

The current core `statebreaker workflow import` command always supplies an empty options
dictionary, so state probes cannot yet be selected from the CLI. This plugin does not modify
the core CLI to add that capability.
