# Latte Lineup

A simple static web app for collecting latte orders and grouping people by milk and syrup.

## Features

- Add a person's name with one milk and one syrup choice
- Include an optional special request note
- Save orders in a shared Google Sheet through Google Apps Script
- Display grouped results by milk, then syrup
- Remove individual orders or clear the full list with an admin token
- Deploy the frontend directly on GitHub Pages

## Files

- `index.html`, `styles.css`, `script.js`: the static frontend
- `apps-script/Code.gs`: the Google Apps Script backend for reading and writing the shared sheet

## Google Sheets setup

1. Create a new Google Sheet for orders.
2. Open `Extensions` > `Apps Script`.
3. Replace the default script with the contents of `apps-script/Code.gs`.
4. In Apps Script, open `Project Settings`.
5. Under `Script properties`, add:
   - `SPREADSHEET_ID`: the sheet ID from your Google Sheet URL
   - `SHEET_NAME`: optional, defaults to `Orders`
   - `CLEAR_ALL_TOKEN`: a secret token used for the app's `Clear All` button
6. Click `Deploy` > `New deployment`.
7. Choose type `Web app`.
8. Set `Execute as` to `Me` and `Who has access` to `Anyone`.
9. Deploy and copy the web app URL.
10. In `script.js`, replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with that deployed Apps Script URL.
11. If you create a new deployment URL later, update `script.js` to match.

The script creates the sheet tab automatically if it does not exist and uses these columns:

- `id`
- `name`
- `milk`
- `syrup`
- `note`
- `createdAt`

## Local use

Open `index.html` in a browser after you configure the Apps Script URL in `script.js`.

## GitHub Pages deployment

1. Create a GitHub repository and add these files.
2. Push the contents to the `main` branch.
3. In GitHub, open `Settings` > `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select the `main` branch and the `/ (root)` folder.
6. Save and wait for the Pages URL to be published.
