import os
import pandas as pd
import pdfplumber
import subprocess
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# === CONFIGURATION ===
INPUT_FOLDER = r"C:\Users\Travis Office\Desktop\Hogman Lumber\Heber Store\Heat Map Project\Compass Raw Data"
OUTPUT_FOLDER = r"C:\Users\Travis Office\Desktop\Hogman Lumber\Heber Store\Heat Map Project\Processed Data"
JSON_SCRIPT_PATH = r"C:\Users\Travis Office\Desktop\Hogman Lumber\Heber Store\Heat Map Project\generate_bin_json.py"

# === PROCESSING FUNCTION ===
def process_dataframe(df, output_filename):
    print(f"\nProcessing {output_filename}...")

    # Handle alternate column names
    location_column = None
    for col in df.columns:
        if col.strip().lower() in ['location', 'loc']:
            location_column = col
            break

    if not location_column:
        print("⚠️ WARNING: No usable 'Location' or 'Loc' column found. Here are the columns detected:")
        print(df.columns.tolist())
        print(df.head(5))
        return  # Stop processing this file

    df['Location'] = df[location_column].astype(str).str.strip().str.upper().str.replace(" ", "")
    df = df.dropna(subset=['Location'])
    
    # -- the rest of your summarizing code continues normally --



    for col in ['QOH', 'Turns', 'Avg Cost', 'Retail', 'QOO', 'GP%\nAvg Cost']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    df = df[df['QOH'].fillna(0) > 0]

    def summarize(group):
        result = {}
        result['Quantity on Hand'] = group['QOH'].sum()
        result['Margin'] = group['GP%\nAvg Cost'].mean()
        result['Turns'] = group['Turns'].mean()
        result['Average Days on Hand'] = 365 / result['Turns'] if result['Turns'] and result['Turns'] > 0 else None
        result['On Order'] = group['QOO'].sum()
        result['Cost'] = group['Avg Cost'].sum()
        result['Retail Price'] = group['Retail'].mean()
        result['Total Value'] = (group['QOH'] * group['Avg Cost']).sum()

        sales_cols = [col for col in group.columns if "Sales Units" in col]
        sales_30 = sales_cols[:1]
        sales_60 = sales_cols[:2]
        sales_90 = sales_cols[:3]

        result['30 Days Sales $'] = group[sales_30].sum().sum() if sales_30 else None
        result['60 Days Sales $'] = group[sales_60].sum().sum() if sales_60 else None
        result['90 Days Sales $'] = group[sales_90].sum().sum() if sales_90 else None

        result['Dead Stock Flag (T or F)'] = (result['Turns'] < 0.1 or result['90 Days Sales $'] == 0)

        avg_sales_30 = result['30 Days Sales $'] / 30 if result['30 Days Sales $'] else 0
        excess_threshold = avg_sales_30 * 90
        result['Excess Inventory Flag - If QOH > X days of supply or > Y% over average sales.'] = (
            result['Quantity on Hand'] > excess_threshold if avg_sales_30 > 0 else False
        )

        reorder_point = 10
        result['Reorder Needed (T or F)'] = (result['Quantity on Hand'] < reorder_point)

        return pd.Series(result)

    summary = df.groupby('Location').apply(summarize).reset_index()

    final_cols = [
        'Location',
        'Quantity on Hand',
        'Margin',
        'Turns',
        'Average Days on Hand',
        'On Order',
        'Cost',
        'Retail Price',
        'Total Value',
        '30 Days Sales $',
        '60 Days Sales $',
        '90 Days Sales $',
        'Dead Stock Flag (T or F)',
        'Excess Inventory Flag - If QOH > X days of supply or > Y% over average sales.',
        'Reorder Needed (T or F)'
    ]

    for col in final_cols:
        if col not in summary.columns:
            summary[col] = None

    summary = summary[final_cols]

    output_path = os.path.join(OUTPUT_FOLDER, output_filename)
    summary.to_excel(output_path, index=False)
    print(f"✅ Saved cleaned file: {output_path}")

# === PAGE PROCESSING FUNCTION ===
def extract_table_from_page(page_number, pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_number]
        table = page.extract_table()
        if table:
            df_page = pd.DataFrame(table[1:], columns=table[0])
            return df_page
        return None

# === MAIN AUTOMATION ===
def main():
    files = [f for f in os.listdir(INPUT_FOLDER) if f.lower().endswith((".xlsx", ".pdf"))]

    for file in files:
        raw_file_path = os.path.join(INPUT_FOLDER, file)

        # Extract date string from filename (e.g., '2025-04-29' from '2025-04-29.pdf')
        date_str = os.path.basename(file).split('.')[0]
        output_filename = f"{date_str}.xlsx"
        cleaned_file_path = os.path.join(OUTPUT_FOLDER, output_filename)

        if not os.path.exists(cleaned_file_path):
            if file.lower().endswith(".xlsx"):
                print(f"📄 Loading Excel file: {file}")
                df = pd.read_excel(raw_file_path)
                process_dataframe(df, output_filename)

            elif file.lower().endswith(".pdf"):
                print(f"📄 Loading PDF file: {file}")
                with pdfplumber.open(raw_file_path) as pdf:
                    total_pages = len(pdf.pages)

                start_time = time.time()
                all_tables = []

                with ThreadPoolExecutor(max_workers=10) as executor:
                    futures = {executor.submit(extract_table_from_page, i, raw_file_path): i for i in range(total_pages)}
                    for idx, future in enumerate(as_completed(futures), 1):
                        elapsed_time = time.time() - start_time
                        avg_time_per_page = elapsed_time / idx
                        remaining_pages = total_pages - idx
                        estimated_remaining_time = avg_time_per_page * remaining_pages

                        mins, secs = divmod(int(estimated_remaining_time), 60)
                        print(f"🔄 Extracting page {idx} of {total_pages}... Estimated time left: {mins}m {secs}s")

                        df_page = future.result()
                        if df_page is not None:
                            all_tables.append(df_page)

                if all_tables:
                    df = pd.concat(all_tables, ignore_index=True)
                    process_dataframe(df, output_filename)
                else:
                    print(f"❌ No tables found in PDF: {file}")

        else:
            print(f"⚠️ Skipping {file}, already cleaned.")

    # Run JSON generation after processing
    if os.path.exists(JSON_SCRIPT_PATH):
        print("\n🔄 Running JSON generation script...")
        subprocess.run(["python", JSON_SCRIPT_PATH], check=True)
        print("✅ JSON generation completed!")
    else:
        print(f"❌ JSON script not found: {JSON_SCRIPT_PATH}")

if __name__ == "__main__":
    main()