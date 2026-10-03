# Evidence references and supersede lineage validation

Issue: #84

This slice completes the remaining Career Evidence breadth requirements without introducing a generic metadata bag or an occupation-specific history model.

## Evidence references

Confirmed or user-authored Career Evidence may retain up to ten optional references.

Supported reference kinds:

- `url`: a user-provided `http` or `https` link;
- `local`: an inert text reference to a local work sample, file, folder, or other user-recognizable location.

Rules:

- references are optional;
- URL references reject non-web schemes such as `file:`, `javascript:`, and custom protocols;
- local references are stored as text and are never opened or executed automatically;
- a reference never establishes a factual qualification merely because it exists;
- deterministic requirement matching continues to use Career Evidence facts, not reference targets;
- references can be opened only through an explicit user action and existing external-URL validation;
- references follow a fact when that fact is explicitly superseded.

## Supersede lineage

A confirmed or user-authored fact may be replaced when the user determines that the current record is incomplete or no longer accurate.

The replacement operation:

1. creates a new user-authored Career Evidence record;
2. preserves the predecessor instead of rewriting or deleting it;
3. makes the predecessor non-authoritative for matching/resume truth by retiring it from confirmed state;
4. writes an explicit predecessor → successor `supersedes` lineage edge;
5. copies the predecessor's optional references to the successor;
6. exposes the retired record as superseded history rather than conflating it with an ordinary rejection.

This preserves auditability while keeping only the current fact eligible to support requirements or generated application claims.

## Nontraditional evidence validation

The existing governed universal fixture set already exercises:

- recent-graduate/project evidence;
- career-change/transferable evidence;
- skilled-trades and licensed-healthcare credentials;
- open-source/portfolio-heavy technical evidence;
- return-to-work/nonlinear history.

This slice adds a military-to-civilian logistics fixture using the ordinary `role` evidence subject type. The fixture must map military logistics evidence to civilian logistics requirements through the same deterministic requirement/evidence boundary used for civilian employment.

Passing that fixture is evidence that military service does not require a special Career Evidence schema merely to participate in matching. Domain-specific military concepts should only become first-class if later user stories demonstrate a concrete semantic need.

## Regression requirements

- reference validation rejects unsafe URL schemes and excessive reference counts;
- reference and lineage records survive restart;
- superseded predecessors do not continue supporting requirements;
- successors remain ordinary canonical Career Evidence and can support requirements according to existing authority rules;
- Electron E2E covers creation with references, replacement, visible superseded history, and persistence after reload;
- the military-to-civilian fixture uses production requirement extraction/mapping, not a fixture-only scoring path.
