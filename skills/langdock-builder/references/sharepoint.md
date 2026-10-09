# SharePoint & Excel from the browser (debug, cleanup, setup)

Run these with chrome-devtools `evaluate_script` in a tab on `https://<tenant>.sharepoint.com/sites/<Site>/…`
(same-origin; from the Langdock tab the calls fail with CORS). The user must be logged in to M365 in that profile.
Large return values → `evaluate_script(filePath=…)` inside the working directory.

## Inspect
```js
const H = {headers: {Accept: 'application/json;odata=nometadata'}}, b = '/sites/<Site>/_api/web';
// document libraries (the German default library is "Freigegebene Dokumente", title "Documents")
(await (await fetch(b + "/lists?$filter=BaseTemplate eq 101&$select=Title,RootFolder/ServerRelativeUrl&$expand=RootFolder", H)).json()).value
// folders + files of a folder
await (await fetch(b + "/GetFolderByServerRelativeUrl('/sites/<Site>/Freigegebene Dokumente')?$expand=Folders,Files", H)).json()
// file metadata incl. lock owner
await (await fetch(b + "/GetFileByServerRelativeUrl('<path>')?$select=Length,TimeLastModified&$expand=LockedByUser", H)).json()
```
Langdock action folder URLs must include the library: `https://<tenant>.sharepoint.com/sites/<Site>/Freigegebene%20Dokumente/<Folder>`.

## Download (binary → base64 → local file)
```js
const r = await fetch("/sites/<Site>/_api/web/GetFileByServerRelativeUrl('<path>')/$value", {cache: 'no-store'});
const u = new Uint8Array(await r.arrayBuffer()); let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s);
```
Save with `filePath`, decode locally (`re.search(r'([A-Za-z0-9+/=]{1000,})', raw)` → `base64.b64decode`). Read PDFs
with the Read tool (`pages`) to check the rendering.

## Upload / overwrite, recycle
```js
const dig = (await (await fetch('/sites/<Site>/_api/contextinfo', {method: 'POST', headers: {Accept: 'application/json;odata=nometadata'}})).json()).FormDigestValue;
await fetch("/sites/<Site>/_api/web/GetFolderByServerRelativeUrl('<folder>')/Files/add(url='<name>',overwrite=true)",
  {method: 'POST', headers: {Accept: 'application/json;odata=nometadata', 'X-RequestDigest': dig}, body: bytes});
await fetch("/sites/<Site>/_api/web/GetFileByServerRelativeUrl('<path>')/recycle()", {method: 'POST', headers: {'X-RequestDigest': dig}});
```
- Embed the bytes as a base64 literal in the function (≈10 KB is fine).
- `423 Locked` = the workbook is open in Excel (co-authoring, `LockedByUser`). Ask the user to close it, retry in a loop.
- `recycle()` keeps it restorable (recycle bin) — prefer it over delete.

## Excel journal tables
- Langdock Excel actions need a real **Excel table** (ListObject), not just a named sheet. Create with openpyxl
  (`Table(displayName="Journal", ref="A1:X2")`; a table needs ≥ 1 data row in the file → the empty row stays until
  removed). Reference: langdock-belege `tools/make_journal.py`.
- Editing rows: download → `load_workbook` → `ws.delete_rows(i, n)` → fix `ws.tables["Journal"].ref` → upload.
  Re-download right before editing and assert the expected rows are there (users may have added entries).
- Graph-style Excel REST (`_vti_bin/ExcelRest.aspx`) is retired — inspect workbooks by downloading them.
