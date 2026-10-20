# R. board game

A personal board game library. Games live in a Google Sheet, and this app reads and updates that sheet.

## Run it

```bash
npm install
cp .env.example .env.local
```

Put the Apps Script web app URL in `.env.local`:

```
VITE_SCRIPT_URL=https://script.google.com/macros/s/your-deployment-id/exec
```

Then start the app and open the address Vite prints (usually http://localhost:5173):

```bash
npm run dev
```

Restart the dev server after changing `.env.local`.

Other commands:

```bash
npm run build
npm run preview
npm run lint
```

## Using the library

The sidebar searches the library and filters it. The main area groups games by location.

- **Search** matches a game’s name, tags, and location.
- **Tag** lists every tag on the sheet plus the ones the app adds itself: a friend’s place, `willing to sell`, and `unplayed`. **Untagged** shows games with none of those.
- Location links jump to that section. Empty sections stay hidden.
- **Add game** writes a new row. Type at least two letters in the name field to pick a title from the catalog. Only the name is filled in. Rating, tag, location, played, and willing to sell stay yours.
- Click a card to open it. **Edit** on the card opens the same dialog ready to change. Save writes the row back to the sheet. Delete removes that row.
- **Played** and **Willing to sell** are Yes, No, or blank.
- A game marked willing to sell shows a `willing to sell` pill. A game marked not played shows `unplayed`, and its rating stays off the card. Preordered games also hide the rating. The rating is still there in the dialog.
- **Settings**, under Add game, has **Turn on lights** / **Turn off lights**. The choice is remembered in this browser. **Edit locations** puts an Edit button under each location. **Show as list** stacks each game in a row; **Show as cards** brings the grid back. That choice is remembered too. Renaming updates the location of every game in that section. Renaming Preordered also clears the `preordered` tag so those games follow the new name.

Locations the app already knows:

| Location | What lands here |
| --- | --- |
| Vilnius | Location cell is Vilnius |
| Niauri | Location cell is Niauri |
| At Friends | Location starts with `at `, such as `at Adomas` |
| Preordered | The tag list includes `preordered`, even if the location cell says something else |

A tag of `preordered` wins over the location cell. Anything else uses the location text as its own section.

## Sheet

The first row is the header. The app expects these columns:

`id`, `name`, `rating`, `tag`, `location`, `played`, `willing to sell`

`played` and `willing to sell` store `yes` or `no`. Tags are a comma-separated list. The app assigns an id when a new game does not have one.

`apps-script/Code.gs` is the script that talks to the sheet. In Apps Script, paste that file into the project bound to the sheet, save, then deploy it as a web app with access set to **Anyone**. A new deployment gets a new `/exec` URL. Put that URL in `.env.local`. Opening the URL in a private window should show JSON, not a Google sign-in page.
