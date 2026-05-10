# Latte Lineup

A simple static web app for collecting latte orders and grouping people by milk and syrup.

## Features

- Add a person's name with one milk and one syrup choice
- Save orders in a shared Google Sheet through Apps Script
- Display grouped results by milk, then syrup
- Remove individual orders or clear the full list
- Deploy directly on GitHub Pages

## Files

- `index.html`, `styles.css`, `script.js`: the GitHub Pages frontend
- `apps-script/Code.gs`: the Google Apps Script backend for reading and writing the shared sheet

## Google Sheets setup

1. Create a new Google Sheet.
2. Copy the sheet ID from the URL.
Example:
`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Open `Extensions` > `Apps Script`.
4. Replace the default script with the contents of [Code.gs](C:/ProjectSpace/baileyJava/apps-script/Code.gs).
5. In `Code.gs`, set `SPREADSHEET_ID` to your sheet ID. You can also change `SHEET_NAME` if you want a different tab name.
6. Click `Deploy` > `New deployment`.
7. Choose type `Web app`.
8. Set `Execute as` to `Me` and `Who has access` to `Anyone`.
9. Deploy and copy the web app URL.
10. In [script.js](C:/ProjectSpace/baileyJava/script.js), replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with your deployed Apps Script URL.
11. If you redeploy a new version later, keep `script.js` updated with the latest web app URL if it changes.

The script will create an `Orders` sheet tab automatically and add these columns:
- `id`
- `name`
- `milk`
- `syrup`
- `createdAt`

## Local use

Open `index.html` in a browser.

## GitHub Pages deployment

1. Create a GitHub repository and add these files.
2. Push the contents to the `main` branch.
3. In GitHub, open `Settings` > `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select the `main` branch and the `/ (root)` folder.
6. Save and wait for the Pages URL to be published.
