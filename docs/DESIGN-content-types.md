# Design proposal: content types instead of Webform

> **Status: proposal, reviewed.** Nothing here is implemented yet.
> [ARCHITECTURE.md](ARCHITECTURE.md) still describes the current Webform
> proof of concept. Decisions from the first review are listed under
> [Decisions](#decisions); one question remains open.

## Why

Formy started as a friendlier editor for Webform. The project it was built
for can't use Webform to store its forms:

- Submissions must work with Views, the History module and the contributed
  Workflow module. Webform stores answers in its own tables, outside the
  Field API, so they are hard to query, list and move through workflow
  states.
- The forms are very long. Webform shows tabular submission data
  horizontally, which is unusable at that length.
- Webform replaces Drupal's plain radio buttons with its own element, and
  some needed field types have no Webform equivalent.

So the project's 100+ forms are **content types**: each form is a node type,
each question is a field, and each submission is a node.

The client, a civil aviation safety agency, also needs its own staff to
create forms and change them when regulations change, without developers.
Formy becomes the tool for that, working on content types.

## Goals

1. Agency staff create and change forms in Formy's document-style editor.
2. Forms are ordinary content types and submissions are ordinary nodes, so
   Views, Workflow, History, revisions and every Drupal field type keep
   working.
3. **A record is never changed by a later edit to its form.** An inspection
   filled in on a checklist must keep showing that checklist's questions,
   wording and answers, whatever happens to the form afterwards.
4. Every record shows which version of its form it was filled in on.
5. Edits made by staff on the live site survive the developers' deployments.
6. Formy can open the project's existing content types without breaking them.

Not goals for now: Webform support (dropped), approval before changes go live
(a save goes live, unless it is scheduled; see
[Effective dates](#effective-dates-optional)), printed documents (built
separately, on top of nodes).

## The model: form families and versions

```
 Form family "Ramp inspection"
 ├── Version 1  = node type "ramp_inspection"      retired   214 records
 ├── Version 2  = node type "ramp_inspection_v2"   retired    87 records
 └── Version 3  = node type "ramp_inspection_v3"   current     0 records
```

- A **form family** is what staff think of as "the form". It has a name and
  an ordered list of versions.
- A **version** is a node type. Exactly one version per family is
  **current**: new records can only be created with it.
- The others are **retired**: their records stay viewable, searchable and
  usable in Views, but no new records can be created from them.
- Each record's node type *is* its version, so "which checklist did this
  inspection follow?" is always answered by the record itself.

The family and version live in the node type's third-party settings
(`formy.family`, `formy.version`, `formy.status`), so they travel with the
node type and need no new tables.

## Editing rules

The rule that protects records is simple and enforced by Formy, not left to
staff discipline:

| The current version has… | When staff save changes… |
| --- | --- |
| **No records** | The changes apply to it in place. Building a new form is as fast as today. |
| **Records** | Formy creates the **next version** with the changes, makes it current, and retires the old one. The old version and its records are left untouched. |

The editor says so before saving: *"Ramp inspection has 214 records, so your
changes will be saved as version 3. Existing records keep version 2."*

"Has records" means at least one node of that type exists, counted without
access checks.

There is no exception for small edits: once a form has records, a typo fix
in a label or help text also creates a new version, because it changes what
the form says. Records keep the wording they were filled in with.

When a version is created, Formy asks for the new node type's
**description**, pre-filled with the previous version's. Staff use it to say
why the version exists (for example the regulation it implements), so no
separate change log is needed.

### What creating a version does

1. Creates a node type with a new machine name (see [Machine names](#machine-names)).
2. **Re-uses the same fields.** For every question it keeps, the new version
   gets a field instance on the **same field storage** as the old version.
   Answers to the same question across versions live in the same database
   table, so Views can report across versions without extra work, and no
   tables are created for unchanged questions.
3. Applies the edits: new questions get new fields (or re-use existing ones,
   see [Field reuse](#field-reuse)); removed questions simply aren't added to
   the new version.
4. Copies everything else attached to the old node type: form and view
   displays (including Formy's headings and text, and any Field Group
   settings), role permissions (`create`, `edit own`, `edit any`, `delete`…
   for that type), Workflow assignment, and node type settings (preview
   mode, "display author and date", published by default…).
5. Lists any other configuration that depends on the old node type and that
   Formy doesn't know how to copy (a Pathauto pattern, a Search API index,
   an Entity Print or FillPDF template, a View filtered on that type), found
   through Drupal's config dependency graph. Staff see them, and developers
   can teach Formy to copy them over time.
6. Marks the new version current and the old one retired, in one step.

Removing a question from a version never deletes data: it only means the
next version doesn't include it. The field storage keeps the old answers as
long as any version uses it. Drupal itself still forbids changing a field's
type or storage once it has data; Formy won't offer that either.

### Retired versions

- Create access is denied for retired node types (`hook_node_create_access`),
  and they are hidden from "Add content".
- Existing records stay viewable and **editable**, so an inspection that was
  in progress can be finished on the version it started on. If staff don't
  want that for a given record, they cancel it and start a new one on the
  current version.
- Retired versions are hidden from the content type list by default, so the
  admin screens don't fill up with old versions.

### Machine names

Node type and field machine names are limited to 32 characters, and field
names start with `field_`. Formy derives names from the label with a short
version suffix, `ramp_inspection_v3`, truncating the label part when needed
and adding a short hash on collision. Labels can change freely; machine
names never do.

## Questions become fields

Each Formy component, which today converts its settings to and from a
Webform element, instead converts them to and from a **field recipe**:

| Part | Example for "Single choice" |
| --- | --- |
| Field storage | type `list_string`, cardinality 1, allowed values |
| Field instance | label, description (help text), required |
| Form widget | `options_buttons` (plain radio buttons) or `options_select` |
| View formatter | `list_default` |

The contract stays the same as today: `toField(settings)` and
`fromField(storage, instance, widget, formatter)` must be inverses, and the
existing test base checks that for every component. Import stays "lossless
or locked": a field Formy can't represent faithfully becomes a locked block
that can be moved but not changed.

Settings that live on the **field storage** (allowed values, cardinality)
are shared by every version and every form that re-uses the field. Formy
only lets staff change them in ways Drupal allows with data, such as adding
choices; anything else needs a new field.

### Headings and text between questions

Content type forms have no place for headings and explanatory text. Formy
stores them in the form display's third-party settings, with their position
among the fields, and adds them to the node form with a form alter. They are
copied with the form display when a version is created, and disappear
cleanly if Formy is uninstalled.

Long forms can be split into sections. Formy renders a heading as the start
of a section (a `details` or fieldset element), which keeps very long
checklists readable without extra modules.

## Field reuse

With 100+ long forms, one new field per question per form would mean
thousands of database tables (two per field: data and revisions). Formy
therefore offers existing fields when staff add a question:

- The `/` menu lists matching fields already used elsewhere: *"Aircraft
  registration — used in 34 forms"*.
- Re-using a field shares its storage settings (type, allowed values) with
  the other forms, while label, help text and required are per form.
- A new field is created only when nothing suitable exists.

Re-use also makes cross-form reporting possible: one View can list the
aircraft registration from every inspection type.

## Links between forms

Inquiries, checklists and audits are linked with entity reference fields,
which list the node types they may point at. When a version is created,
Formy **adds** the new node type to every reference field that targeted the
old one, and keeps the old one so existing links stay valid. Because retired
versions can't be created, any new checklist created from an inquiry is the
current version.

### Fields that reference content types

The project plans a multi-value field (possibly custom) on inquiry forms
that references **content types** rather than nodes: it says which
checklists apply to an inquiry. Pointing it at a specific version would go
stale as soon as that checklist gets a new version.

Proposed: such fields store the **form family** instead, and the current
version is looked up when a checklist record is actually created. An
inquiry that says "Ramp inspection applies" then always produces a record on
the current version, while records already created keep theirs. Formy
provides the lookup as a service, so the custom field only needs to call it.
If the field must stay a plain reference to node types, Formy can instead
add each new version to it, as for entity reference fields, but stored data
would still point at old versions. (Open question.)

## Effective dates (optional)

A version can be saved with an **effective date** instead of going live
immediately, for regulatory changes known in advance:

- Until that date it is **scheduled**: staff can open and refine it (it has
  no records, so edits apply in place), but records are still created on the
  current version.
- On the date, cron makes it current and retires the previous version.
- A family has at most one scheduled version. Editing the form while one
  exists opens the scheduled version.
- Without a date, saving goes live at once, as before.

This is a later addition: the first release can ship without it, since the
version model doesn't need to change to support it.

## Views and reporting

Views filter by node type, so a View built for version 1 would miss version
2's records. Formy adds a Views filter and contextual filter, **"Formy form
(all versions)"**, that matches every node type in a family. Views built on
it keep working as new versions appear. Optionally, a "version" field shows
`v2` next to each record.

## Config sync: who owns the forms

Node types, fields and displays are configuration. If staff create or
change forms on the live site, the developers' next `drush cim` would reset
them to what's in Git, and deleting a node type or field through config
import also deletes its answers. This must not happen.

Formy-managed content types therefore belong to the live site, not to Git:

- Formy hooks into Drupal's config storage transform events (the mechanism
  Config Ignore uses) and leaves every Formy-managed config item out of both
  export and import: node types with `formy.family`, their fields, field
  storages used only by them, and their displays. A field storage that a
  developer-owned content type also uses stays in Git, since that type
  needs it to install.
- Developers keep deploying everything else as usual.
- A content type becomes Formy-managed when Formy creates it, or when a
  developer **adopts** an existing one (a Drush command and an admin
  action). Before adoption, developers own it; after, staff do.

Formy owning this logic, rather than relying on hand-written Config Ignore
patterns, means it always matches exactly the config Formy manages, including
versions created next week.

## Adopting the existing content types

The project's 100+ content types become Formy forms through adoption:

1. Formy imports each node type into a document (lossless or locked).
2. It starts a form family with that node type as version 1. If the type
   already has records, the first edit in Formy creates version 2.
3. It reports what it locked (field types without a component yet), so
   developers know which components to write first.

## Permissions

- **Editing forms** (Formy): a new permission, "compose forms", separate
  from Drupal's "administer content types", so agency staff can manage forms
  without access to the rest of the site's structure.
- **Filling forms**: unchanged, Drupal's per-type node permissions, copied to
  each new version.

## What changes in the code

| Area | Change |
| --- | --- |
| Editor (`js/src`) | Mostly unchanged. New: the version notice before saving, and "re-use an existing field" in the `/` menu. |
| Document format | Unchanged, plus `field` references for re-used fields. |
| Components (`src/Plugin`) | `toElement()`/`fromElement()` become `toField()`/`fromField()`. Settings schemas stay. |
| `DocumentConverter` | Reads and writes field instances and displays instead of Webform elements. |
| `ChangeGuard` | Replaced by the versioning rule; checks shrink to what Drupal forbids on fields with data. |
| New services | Form family and versioning, field reuse lookup, config sync filter, adoption. |
| Webform | Dependency removed. |

## Scale

The agency can't predict how often forms will change; it depends on
national and international regulatory changes. The design limits growth
where it can:

- Versions are only created for forms that already have records. Forms
  being built or revised before first use are edited in place.
- Unchanged questions re-use their fields, so a new version adds node type
  and display configuration, not database tables.
- Retired versions are hidden from admin lists.

The remaining cost is the number of node types: Drupal keeps per-type field
definitions and per-type permissions, and some admin pages list every type.
Before building on this model, a short spike should generate realistic
volumes on a test site, for example 150 families with 10 versions each
(1,500 node types), and measure page load, cache size, the permissions page
and a cross-version View. If a threshold shows up, a later option is to
archive very old retired versions' configuration while keeping their
records readable, but that should be decided on measurements.

## Alternatives considered

**One content type for all forms, answers stored as JSON.** Changing a form
would never touch the database schema, but each answer would no longer be a
real field: Views, field widgets, Workflow and History on individual answers
would all need custom code. That is the same trade-off that ruled out
Webform.

**A dedicated "submission" entity type instead of nodes.** Cleaner
separation from site content, but the History module only works with nodes,
and the project already has 100+ node types. Not worth the migration.

**MongoDB (or another document database) for submissions.** A natural fit
for forms whose shape changes, but Drupal has no maintained MongoDB entity
storage for current versions, so submissions would lose Views, Workflow,
History, revisions and field widgets, everything the project chose content
types for. It would also add a second database for the agency to secure,
back up, and include in audits. If document-style storage is ever needed,
the JSON columns of MySQL, MariaDB and PostgreSQL provide it inside the
existing database.

## Decisions

From the first review:

1. **Wording fixes:** no in-place exception. A typo fix on a form with
   records creates a new version like any other change.
2. **In-progress records on retired versions:** stay editable. To restart on
   the current version, staff cancel the record and create a new one.
3. **Entity reference fields:** adding each new version to the fields that
   referenced the old one is right for links between records.
4. **Change log:** none in Formy. The new node type's description says why a
   version was created.
5. **Effective dates:** wanted as an optional feature, after the first
   release.
6. **How often forms change:** unpredictable, driven by regulation. Hence
   the [scale spike](#scale) before building.

## Open questions

1. **Fields that reference content types:** should the planned field on
   inquiries store the form family, resolved to the current version when a
   checklist record is created (proposed), or stay a plain reference to node
   types? See [Fields that reference content types](#fields-that-reference-content-types).
