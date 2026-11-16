<div align="center">

# 🌐 [**Open Atlas → g-c-3.github.io/githubmanager**](https://g-c-3.github.io/githubmanager/)

*Created by Gokul Chandar*

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
   | Passcode (required) | your own: any length, any letters, numbers or symbols |

3. Tap **Save** (back to the first screen) or **Save and open**. Atlas checks the token against GitHub before it saves anything.
4. Next time, pick the repository in **Saved** and tap **Login**. Atlas remembers the one you used last.

### Several repositories

Add as many as you like. **Saved** lists them as `account/repo`, is greyed out until you save the first one, and Login stays off until then. Inside the app:

- Tap the repository name at the top, or **Menu → Switch repository**, to change repository.
- **Menu → Saved repositories** lets you tick one or several and delete them. You must type `confirm` first.
- **Menu → Edit details** changes the open repository's name, branch, token or passcode.
- **Reset this device** (on the first screen, and in the Menu) removes every saved repository, token and setting, and clears offline files. It also asks you to type `confirm`.

### The passcode

Every saved repository has a passcode, and **you choose what it is**. There is no minimum length and no rule about numbers or symbols. One character works, though a longer one is safer.

- Your token is encrypted with the passcode (PBKDF2-SHA256, **600,000 rounds**, then AES-256-GCM) before it is saved. Nobody can open it without the passcode, **including you if you forget it**. You would delete that saved repository and add it again.
- There is one passcode box with an **eye** to show what you typed, so you can check it. There is no repeat box.
- On the login window press **Enter** to log in. Password managers are told it is a new / current password, so they can fill it in for you.
- There is **no fingerprint or face unlock**. The passcode is the only way in.
- Repositories saved by an older version without a passcode ask you to choose one the first time you log in, and are encrypted with it from then on.
- Honest limit: a passcode protects the token while you are logged out. While you are logged in, the token is held in the page's memory, as any web app must. A short passcode could be guessed by someone who copies your browser data, so choose longer on shared devices.
- **Menu → Lock after no activity** sets 1, 2, 5 or 15 minutes, or never. It locks after that long without a touch or key press, or that long with the page in the background. It never locks in the middle of a running upload or extract.

Your details never leave the device except to GitHub.

## Moving around

- The **⋮ menu** button is the last button on the Files line, right after Add files. It holds Files, Extract and History, the **Light / Dark / Night** switch and the settings. The **lock** button at the top right locks Atlas straight away, with a short fade, and returns to the login screen.
- On **Extract** and **History** a floating **Home** button sits level with the page title and stays in place while you scroll. Tap it to go to Files. Dark is the default, Light is white, and Night is pure black for OLED screens. Your choice is remembered.
- The **Back button or gesture** works inside the app: it closes a window or the viewer, goes up a folder, or leaves a tab, instead of leaving the site. At the top of a repository, press Back twice to log out and return to the login screen. On the login screen, one Back stays put and two quick Backs leave to the page you came from. Back is refused while a job is running.
- **Right-click is switched off** across the app, except in fields where you type (names, token, passcode, limit, the editor). This only removes the browser's menu; it doesn't protect anything.

## Files tab

- The buttons on the **Files** line are, left to right: **Search** (slides open and closed), **Refresh**, **Sort**, **New folder**, **New file** and **Add files**. Press and hold or hover for the name.
- Tap a folder to open it; tap a file to **open it in the viewer**. Tick checkboxes (or **Select all**) to select.
- The action bar offers **Download · Copy · Move · Rename · Convert · Delete**.
- **Move** and **Copy** show your folders as a **tree**. Tap to choose a folder, tap the arrow to open it, or create a new folder right there.
- **Add files** (the arrow button) uploads to the current folder. **Change** opens the same tree.
- **New file** (the page button) creates and opens an empty file in the editor. **New folder** creates a folder (Git can't store empty folders, so a hidden `.gitkeep` is added and never shown).
- **Sort** by name, size or type.
- The top bar shows the repository name, shrinking it to fit.

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

**Joining PDF parts.** If you select PDFs named like `A pages1to16.pdf` and `A pages17to31.pdf` whose page numbers follow on, the download sheet offers **Join continuous PDF parts** (on by default). Each continuous run becomes one file, for example `A pages1to31.pdf`, and everything else is left as it is. Parts that aren't continuous, such as `pages1to16` with `pages32to39`, stay separate. Only the zip is affected; your repository isn't changed.

## When something already exists

| File | Result |
|---|---|
| Skip | Leave the existing one |
| Save as copy | Save in the same folder as `name_1`, then `name_2`, `name_3`, … A file already named `name_1` gets `name_2`. Identical files aren't duplicated |
| Replace | Overwrite (undo from History) |

Folders are always merged: new files go into the folder that's already there. The choice above applies to the files inside it, on the Extract tab, Add files, Copy and Move.

**Replace even if the file is identical** (shown under Replace on Extract and Add files). Normally an identical file is skipped to save time. With this on it is sent again and counted as replaced. Git keeps identical content only once, so the repository itself doesn't change, and a commit with no change is skipped.

## More features

- **Share to Atlas (Android).** Once Atlas is **installed** (Chrome menu → Install app), it appears in Android's Share list. Share files or photos to it, log in, and the *Add files* window opens with them ready. This works only on the installed app on Android, not in a normal browser tab, and I couldn't test it on a real phone, so tell me if your phone behaves differently.
- **Shrink photos.** Switch on in *Add files* or in the Menu. JPG, PNG and WebP pictures are scaled so the longest side is 1280, 2048 or 3000 px and re-saved smaller, and only used if that makes them smaller. Photo details such as location are removed. HEIC photos aren't changed.
- **Retry and resume.** If some files fail or you press Stop, the window stays open and the button becomes **Retry N left**. Only the unfinished files are sent. Files already saved are not sent again. Extract does the same. Short network drops are retried automatically.
- **Search inside files.** Open Search and switch **Names** to **Inside files**, type, and press Enter. It reads text-type files (notes, code, CSV, JSON, HTML and similar) up to 1 MB each and shows the matching line. PDFs and Office files aren't searched.
- **Pictures and links in Markdown.** `![](images/a.png)` and `[next](chapter2.md)` are resolved against the file's own folder. Pictures show in the preview and linked notes open in the viewer.
- **Branches.** **Menu → Branch** lists branches, switches to one, creates a new one from the current one, and merges the current branch into another using GitHub's own merge. If the changes overlap, Atlas says so and you finish it on github.com. The branch you pick is remembered for that saved repository.
- **Back up whole repository.** **Menu → Back up whole repository** downloads every file as a zip, with full folder paths, optionally password protected. It is built in memory, so a very large repository may not fit on a phone.
- **Pinned and recent.** Select an item, tap **More → Pin to the top**, and it appears as a chip above the file list. Recently opened files appear there too. They are kept on this device only, per repository.
- **PDF tools.** Select PDFs and tap **More**: **Join PDFs** (two or more, in the order shown), **Extract pages** (for example `1-3, 5`) and **Rotate pages** (90, 180 or 270 degrees, all pages or chosen ones, as a new file or replacing the original). Results are saved to the repository as a normal commit, so they can be undone from History.
- **Keyboard.** Enter logs in and saves; Esc closes windows; `/` opens search. Wider windows on tablets and desktops.

## Offline and install

- Atlas can be **installed** (browser menu → Install app / Add to Home screen) and its own files work offline.
- Files from your repo are **not** kept offline unless you turn on **Menu → Keep opened files for offline use**. Those copies are stored unencrypted on the device, so leave it off on shared devices. **Clear offline files** removes them.

## Limits

- **100 MB** per file through GitHub's API; larger files are marked and can't be sent.
- The size limit is **50 MB** by default and lets through files up to **0.1 MB below it**: a limit of 50 sends files up to 49.9 MB, a limit of 12.3 sends files up to 12.2 MB. Anything larger is held back until you opt in.
- **Large PDFs are split** (switch on Extract and Add files, on by default). A PDF over the limit is cut into continuous page ranges under it, for example a 120 MB `A.pdf` becomes `A pages1to16.pdf`, `A pages17to31.pdf` and `A pages32to39.pdf`, each just under the limit. Text and pictures are kept; bookmarks, form fields and document-level links are not. Password-protected or damaged PDFs can't be split. PDFs up to 400 MB can be split, but the work happens in memory, so a phone may struggle past a couple of hundred MB. Switch it off to hold such PDFs back instead. **Empty files** are held back too: they are unticked by default, and sent if you tick them in the *Held back* list.
- Everything is processed in memory. Very large archives, PDFs or documents can fail on a phone.
- Documents above 60 MB and text above 20 MB aren't opened in the viewer; download them.
- GitHub rate-limits writes. Atlas paces itself and waits when asked.
- Keep the tab open and the screen on while a long job runs.
- The layout adapts to foldables in both folded and unfolded widths, but it doesn't read the hinge position.

## Privacy and security

- No server, analytics or outside requests. Atlas talks only to `api.github.com` and its own files.
- Markdown and Word content is sanitised. HTML previews run in a locked sandbox. Pictures hosted on outside sites in Markdown are **not loaded**; pictures stored in your repository are.
- Use a fine-grained token limited to this one repository, and revoke it if a device is lost.
- This page is public, but it contains no secrets. Strangers see only the first screen with nothing saved.
- **Log out** and **Reset this device** are in the menu. Atlas locks itself after the idle time you choose (default 2 minutes).

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

**Atlas was created by Gokul Chandar.**

All components are bundled; their licences are in `app/licenses/`.

- [7-Zip](https://www.7-zip.org/) in WebAssembly via [`7z-wasm`](https://www.npmjs.com/package/7z-wasm): LGPL, with the **unRAR restriction**
- [zip.js](https://gildas-lormeau.github.io/zip.js/): BSD-3-Clause
- [pdf.js](https://mozilla.github.io/pdf.js/) (Mozilla): Apache-2.0
- [SheetJS](https://sheetjs.com/) community edition and [`cfb`](https://github.com/SheetJS/js-cfb): Apache-2.0
- [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) and [JSZip](https://stuk.github.io/jszip/): MIT
- [CodeMirror 6](https://codemirror.net/): MIT
- [marked](https://marked.js.org/) (MIT), [DOMPurify](https://github.com/cure53/DOMPurify) (Apache-2.0 / MPL-2.0), [highlight.js](https://highlightjs.org/) (BSD-3-Clause)
- The PowerPoint writer starts from the blank template in [python-pptx](https://github.com/scanny/python-pptx) (MIT)
