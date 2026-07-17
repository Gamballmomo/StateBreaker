# StateBreaker HAR Capture

`statebreaker-har-capture` is an offline importer for minimal HAR 1.2 files. It parses a
HAR without network access, conservatively filters known static resources, removes
transport-managed request headers, and produces a deterministic StateBreaker `Workflow`
with a linear dependency chain.

## Install and use

From the StateBreaker repository root:

```bash
python -m pip install -e plugins/statebreaker-har-capture
statebreaker workflow import recording.har --plugin har.capture --output workflow.json
statebreaker workflow validate workflow.json
```

The importer accepts `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` requests. JSON bodies and
`application/x-www-form-urlencoded` bodies are normalized into the core `json_body` and
`form_body` contracts. Other raw body formats are rejected with a clear error. Dynamic-variable
inference and response extractors are not implemented yet.

Authorization and Cookie headers are preserved by default because a captured authenticated
workflow must remain replayable. Treat exported Workflow files as sensitive data. Direct API
callers can set `strip_credentials=True` when they need a shareable redacted artifact.

## Static-resource filtering

The plugin manifest advertises the `static-resource-filtering` capability.

Filtering is enabled by default. The importer first keeps entries explicitly marked as `fetch`
or `xhr`, plus responses with `application/json` or a `+json` subtype. It then filters known
static resource types, known static MIME types, and finally exact static extensions from the URL
path. Query strings and fragments do not participate in extension matching.

Entries with unknown or missing metadata, HTML/documents, and other ambiguous types remain in the
workflow unless their URL path has a listed static extension. Request method alone never identifies
a static resource. Filtering preserves the relative request order and uses
each retained entry's original zero-based HAR index in its step ID.

If a state probe selects a filtered entry, capture fails with the original index and a safe reason
category. If every entry is filtered, capture fails before a Workflow is constructed. These errors
do not include request URLs, headers, cookies, authorization values, or bodies.

## Options

Direct plugin callers may pass the strict supported options:

```python
workflow = await HarCapturePlugin().capture(
    Path("recording.har"),
    {
        "filter_static_resources": True,
        "state_probe_entry_indices": [1],
        "strip_credentials": False,
    },
)
```

Set `filter_static_resources=False` through the direct plugin API to retain every HAR entry.
Filtering defaults to `True` when the options mapping is empty.

Indices are zero-based positions in the original `log.entries` array. They must be unique,
non-negative, in range, and refer to a generated step. Selected steps use the `probe` role
and are listed in `state_probe_steps`. Selecting an entry removed by static-resource filtering
is an explicit error and is never silently ignored or remapped.

The core CLI accepts the same mapping from a JSON or YAML file:

```bash
statebreaker workflow import recording.har --plugin har.capture \
  --options capture-options.yaml --output workflow.json
```
