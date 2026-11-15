<div align="center">

# 🌐 [**Open Atlas → g-c-3.github.io/githubmanager**](https://g-c-3.github.io/githubmanager/)

[![Open the app](https://img.shields.io/badge/%E2%96%B6%20OPEN%20THE%20APP-g--c--3.github.io%2Fgithubmanager-6366f1?style=for-the-badge&labelColor=0b1020)](https://g-c-3.github.io/githubmanager/)

</div>

> [!IMPORTANT]
> **App link: <https://g-c-3.github.io/githubmanager/>**
> Works on phones, foldables, tablets and computers. Everything runs in your browser. There is no server.

---

## What it is

**Atlas** is a file manager, viewer and editor for one GitHub repository. It talks to GitHub directly with your own access token.

| | |
|---|---|
| 📁 **Manage** | Browse, select, copy, move (with a folder tree), rename, delete, new folder, new file, sort, search |
| ⬆️ **Add** | Upload files into any folder, with skip / keep both / replace |
| 📦 **Extract** | Unpack ZIP, 7z, RAR, TAR, GZ, BZ2, XZ into a folder, with passwords, and preview files before extracting |
| ⬇️ **Download** | One file directly, or any selection as a zip with or without a password |
| 👁️ **View** | Code, Markdown, images, audio, video, PDF, Word, Excel, PowerPoint, HTML, hex |
| ✏️ **Edit** | Text and code files with highlighting, search, undo, and save as a commit |
| 🔄 **Convert** | Old `.doc` / `.xls` / `.ppt` to `.docx` / `.xlsx` / `.pptx`, saved in the repo, one file or whole folders |
| 🕘 **History** | Undo the last change, and see or restore earlier versions of any file |
| 📴 **Offline** | Installable on your phone; the app itself works offline |

## Install on your repository

The app is a set of files, not one page. Put them in the **root** of `g-c-3/githubmanager`:

```
index.html
sw.js
manifest.webmanifest
.nojekyll
app/            ← scripts, styles, viewers, converters, licences
```

1. Download **`atlas-site.zip`** from where you received it.
2. In the **current** app, open **Extract**, choose the zip, set the destination to **All files** (the top level), choose **Replace** for existing files, and extract.
   Or upload it on github.com and unzip it on a computer first, since GitHub's web upload doesn't unzip.
3. In the repository: Settings → Pages → *Deploy from a branch* → `main` / root.
4. Wait a minute, then open **<https://g-c-3.github.io/githubmanager/>** and reload once.

The app files show in the file list with a small **app** tag, and Delete and Move warn you if the selection includes them. If you'd rather not see them, turn off **Menu → Show app files**.

> [!NOTE]
> You can add more files to `app/` later. The app loads its pieces only when needed, so opening a PDF loads the PDF engine and nothing else. No part of it depends on an outside server.

## Getting started

The first screen has three things: **Add**, a **Saved** list, and **Login**.

1. Create a **fine-grained personal access token** at GitHub → Settings → Developer settings → Personal access tokens. Choose only this repository and give it **Contents: Read and write**.
2. Tap **Add** and fill in:

   | Field | Example |
   |---|---|
   | GitHub Account Name | `g-c-3` |
   | Repo Name | `githubmanager` |
   | Branch (optional) | `main` |
   | Read & Write Access Token | `github_pat_…` |
   | Passcode (optional) | your own |

3. Tap **Save** (back to the first screen) or **Save and open**. Atlas checks the token against GitHub before it saves anything.
4. Next time, pick the repository in **Saved** and tap **Login**. Atlas remembers the one you used last.

### Several repositories

Add as many as you like. **Saved** lists them as `account/repo`, is greyed out until you save the first one, and Login stays off until then. Inside the app:

- Tap the repository name at the top, or **Menu → Switch repository**, to change repository.
- **Menu → Saved repositories** lets you tick one or several and delete them. You must type `confirm` first.
- **Menu → Edit details** changes the open repository's name, branch, token or passcode.
- **Reset this device** (on the first screen, and in the Menu) removes every saved repository, token and setting, and clears offline files. It also asks you to type `confirm`.

### Passcode or not

| | Login | How the token is kept |
|---|---|---|
| **With a passcode** | Asks for it first | Encrypted with your passcode (PBKDF2-SHA256, 200,000 rounds, AES-256-GCM). Nobody can open it without the passcode, including you if you forget it. Delete the entry and add it again |
| **Without** | Opens the repository straight away | Encrypted with a key that this browser keeps and can't export. This stops the token sitting there as readable text. **It doesn't stop someone who is using this browser profile**, since anyone who can open Atlas here can log in. Use a passcode on shared devices |

Each saved repository chooses for itself. Your details never leave the device except to GitHub.

## Files tab

- Tap a folder to open it; tap a file to **open it in the viewer**. Tick checkboxes (or **Select all**) to select.
- The action bar offers **Download · Copy · Move · Rename · Convert · Delete**.
- **Move** and **Copy** show your folders as a **tree**. Tap to choose a folder, tap the arrow to open it, or create a new folder right there.
- **Add files** uploads to the current folder. **Change** opens the same tree.
- **New file** creates and opens an empty file in the editor. **New folder** creates a folder (Git can't store empty folders, so a hidden `.gitkeep` is added and never shown).
- **Sort** by name, size or type.

## The viewer

| Type | How it opens |
|---|---|
| Code and text (`.py` `.js` `.ts` `.java` `.c` `.go` `.rs` `.sh` `.yml` `.toml` `.xml` `.sql` `.tex` and many more, plus `LICENSE`, `README`, `Dockerfile`, `Makefile`) | Highlighted, with find and line wrap |
| Markdown | Rendered page with a **Source** tab. Pictures and links that point to other files in the repo work |
| HTML, SVG | Safe preview (scripts and outside resources blocked) plus source |
| CSV, TSV | Table or text |
| Images | Pinch, double-tap and drag to zoom |
| Audio, video | Your browser's player |
| PDF | Pages drawn in the app (works on Android), zoom, page counter, password prompt |
| Word `.docx` | Page layout view that scales to your screen |
| Excel `.xlsx`, `.ods` | Sheet tabs, merged cells, sticky headers |
| PowerPoint `.pptx` | Slides with text, pictures and tables |
| Archives | **Browse and extract** opens them in the Extract tab |
| Anything else | Hex view of the raw bytes |

Swipe or use the arrows to move to the next file in the folder. **ⓘ** shows details and every earlier version of the file, each with **Restore**.

### Editing

Open a text or code file and tap **Edit**. You get syntax colouring, search, undo and redo, and **Format JSON**. **Save** commits the change and shows a progress bar while it uploads. If the file changed somewhere else while you were editing, Atlas warns you before overwriting it. Original line endings and UTF-8 BOM are kept. Files over 5 MB and non-UTF-8 files are view-only.

## Converting old Office files

Browsers can't show `.doc`, `.xls` and `.ppt`. Atlas converts them on your device, saves the new file next to the original, and opens it. The original stays unless you choose to delete it.

| From → To | Kept | Simplified or lost |
|---|---|---|
| `.xls` → `.xlsx` | Values, formulas, merged cells, basic formatting, all sheets | Charts, pictures, macros |
| `.doc` → `.docx` | Text, headings, tables, bold / italic / underline / colour / size, alignment, inline pictures | Page layout, headers and footers, footnotes, list numbering styles. Pictures that float are placed at the end. EMF/WMF pictures are left out |
| `.ppt` → `.pptx` | Slide text and pictures at their positions | Fonts, colours, backgrounds, animations, charts, shapes |

To convert many at once, select files or folders on the Files tab and choose **Convert**. Files that already have a converted copy are skipped.

> [!NOTE]
> The converters are written for this app and tested on files produced by LibreOffice. Word- and PowerPoint-made files follow the same format but may expose cases I couldn't test. Check a few before relying on a large batch. Password-protected old files can't be converted; remove the password first.

## Supported archives

| Format | Open | Password |
|---|---|---|
| ZIP (ZipCrypto and AES) | ✅ | ✅ |
| 7z (including encrypted names) | ✅ | ✅ |
| TAR, TAR.GZ / TGZ, TAR.BZ2, TAR.XZ | ✅ | n/a |
| GZ, BZ2, XZ (single file) | ✅ | n/a |
| RAR | ✅ through 7-Zip's RAR support | ✅ |

> [!NOTE]
> RAR is untested because I had no RAR file to try. Everything else above was tested end to end.

Tap a file's name in the extract list to **preview it before extracting**.

## Downloading

One file downloads directly. Several items or a folder become one `.zip`, built on your device. Add a **password** if you like:
- **Strong (AES-256)** opens in 7-Zip, WinZip and most Android apps.
- **Compatible (ZipCrypto)** opens almost everywhere but is much weaker.

## When something already exists

| File | Result |
|---|---|
| Skip | Leave the existing one |
| Keep both | Save as `name_1`, `name_2`, … (identical files aren't duplicated) |
| Replace | Overwrite (undo from History) |

For folders: **Merge** puts new files in the existing folder, **Save as copy** creates `Folder_1`, `Folder_2`, …

## Offline and install

- Atlas can be **installed** (browser menu → Install app / Add to Home screen) and its own files work offline.
- Files from your repo are **not** kept offline unless you turn on **Menu → Keep opened files for offline use**. Those copies are stored unencrypted on the device, so leave it off on shared devices. **Clear offline files** removes them.

## Limits

- **100 MB** per file through GitHub's API; larger files are marked and can't be sent.
- Files above **48 MB** (adjustable) are held back during extraction until you opt in. **Empty files** are held back too: they are unticked by default, and sent if you tick them in the *Held back* list.
- Everything is processed in memory. Very large archives, PDFs or documents can fail on a phone.
- Documents above 60 MB and text above 20 MB aren't opened in the viewer; download them.
- GitHub rate-limits writes. Atlas paces itself and waits when asked.
- Keep the tab open and the screen on while a long job runs.
- The layout adapts to foldables in both folded and unfolded widths, but it doesn't read the hinge position.

## Privacy and security

- No server, analytics or outside requests. Atlas talks only to `api.github.com` and its own files.
- Markdown and Word content is sanitised. HTML previews run in a locked sandbox. Pictures hosted on outside sites in Markdown are **not loaded**.
- Use a fine-grained token limited to this one repository, and revoke it if a device is lost.
- This page is public, but it contains no secrets. Strangers see only the first screen with nothing saved.
- **Log out** and **Reset this device** are in the menu. A repository saved with a passcode logs out after two minutes in the background.

## Troubleshooting

| Message | Fix |
|---|---|
| "Couldn't load app/…" | The `app` folder is missing from the repo root. Extract `atlas-site.zip` again |
| Token was rejected | Menu → Edit details, and paste a valid token |
| Repository or branch not found | Check spelling, and that the token covers this repo |
| No permission | The token needs **Contents: Read and write** |
| Repository is empty | Add one file in GitHub first, for example a README |
| README shows as plain text on GitHub | The file must be named **README.md** (with `.md`). Rename it with the pencil icon → file name |
| Page looks old after an update | Close and reopen the app once; the new files load on the second visit |
| PDF shows blank pages | Reload; very large scans can take a moment |

## Credits and licences

All components are bundled; their licences are in `app/licenses/`.

- [7-Zip](https://www.7-zip.org/) in WebAssembly via [`7z-wasm`](https://www.npmjs.com/package/7z-wasm): LGPL, with the **unRAR restriction**
- [zip.js](https://gildas-lormeau.github.io/zip.js/): BSD-3-Clause
- [pdf.js](https://mozilla.github.io/pdf.js/) (Mozilla): Apache-2.0
- [SheetJS](https://sheetjs.com/) community edition and [`cfb`](https://github.com/SheetJS/js-cfb): Apache-2.0
- [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) and [JSZip](https://stuk.github.io/jszip/): MIT
- [CodeMirror 6](https://codemirror.net/): MIT
- [marked](https://marked.js.org/) (MIT), [DOMPurify](https://github.com/cure53/DOMPurify) (Apache-2.0 / MPL-2.0), [highlight.js](https://highlightjs.org/) (BSD-3-Clause)
- The PowerPoint writer starts from the blank template in [python-pptx](https://github.com/scanny/python-pptx) (MIT)
