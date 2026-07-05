# Views Boards Lists Calendar Timeline Gantt

## Required Views

- Board.
- List.
- Table.
- Calendar.
- Timeline.
- Gantt.
- Backlog.
- Sprint board.
- Bug board.
- QA board.
- Workload.
- Roadmap.
- Activity feed.

## View Schema

- id.
- org_id.
- project_id.
- name.
- type.
- visibility.
- owner_id.
- filters_json.
- sort_json.
- group_by.
- columns_json.
- is_default.

## Board Features

- Drag and drop.
- Swimlanes.
- WIP limits.
- Card fields.
- Quick filters.
- Right-side detail drawer.
- Bulk select.

## Gantt Features

- Dependencies.
- Critical path.
- Milestone markers.
- Drag dates.
- Auto-shift dependent work if enabled.

## Edge Cases

- User lacks permission for filtered item.
- Saved view references deleted custom field.
- Drag status blocked by workflow rule.
- Gantt dependency creates date conflict.

