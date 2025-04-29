from datetime import datetime
import pandas as pd
import os
import json
import math

# Directory containing Excel files
data_dir = "."
output_dir = "."

# Collect all .xlsx files
excel_files = [f for f in os.listdir(data_dir) if f.endswith(".xlsx")]

# Storage for available dates
available_dates = []

# Define known valid bin locations
known_bins = set()

# Aisles 01–07 (left and right, up to 10 bins)
for aisle in range(1, 9):
    for side in ["L", "R"]:
        for i in range(1, 11):
            known_bins.add(f"{aisle:02d}{side}{i:02d}")

# Aisles 08–14 (left and right, 7 bins)
for aisle in range(8, 15):
    for side in ["L", "R"]:
        for i in range(1, 8):
            known_bins.add(f"{aisle:02d}{side}{i:02d}")

for file in excel_files:
    file_path = os.path.join(data_dir, file)
    try:
        # Extract date from filename and validate
        date_part = os.path.splitext(file)[0]
        datetime.strptime(date_part, "%Y-%m-%d")
        df = pd.read_excel(file_path)

	# Handle alternate column names
	location_column = None
	for col in df.columns:
    		if col.strip().lower() in ['location', 'loc']:
        		location_column = col
        		break

	if not location_column:
    		raise ValueError("Missing 'Location' or 'Loc' column")

	df = df.dropna(subset=[location_column])
	df[location_column] = df[location_column].astype(str).str.strip().str.upper().str.replace(" ", "")
	df["Location"] = df[location_column]  # Standardize to 'Location' for later use


        data_dict = {}
        for _, row in df.iterrows():
            location = row["Location"]
            if location not in known_bins:
                print(f"⚠️ Skipping unknown bin location: {location}")
                continue
            entry = row.drop(labels=["Location"]).to_dict()

            # Replace NaN with None
            for key, value in entry.items():
                if isinstance(value, float) and math.isnan(value):
                    entry[key] = None

            data_dict[location] = entry

        output_filename = f"bin-data-{date_part}.json"
        output_path = os.path.join(output_dir, output_filename)

        with open(output_path, "w") as f:
            json.dump(data_dict, f, indent=2)

        available_dates.append(date_part)
        print(f"✅ Created {output_filename} with {len(data_dict)} entries.")

    except Exception as e:
        print(f"❌ Failed to process {file}: {e}")

# Write date-index.json (sorted, excludes "latest")
available_dates.sort()
with open(os.path.join(output_dir, "date-index.json"), "w") as f:
    json.dump(available_dates, f, indent=2)

# Copy latest data file to bin-data-latest.json
if available_dates:
    latest_date = available_dates[-1]
    latest_filename = f"bin-data-{latest_date}.json"
    try:
        with open(os.path.join(output_dir, latest_filename), "r") as src, \
             open(os.path.join(output_dir, "bin-data-latest.json"), "w") as dst:
            dst.write(src.read())
        print(f"📂 Copied {latest_filename} ➜ bin-data-latest.json")
    except Exception as e:
        print(f"❌ Failed to create bin-data-latest.json: {e}")

print(f"📅 Updated date-index.json with {len(available_dates)} dates.")
