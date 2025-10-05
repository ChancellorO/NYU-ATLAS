import earthaccess
import numpy as np
import xarray as xr
import pandas as pd
import os

def get_precipitation(lat, lon, date_str, local_path="./data"):
    # Return DataFrame
    os.makedirs(local_path, exist_ok=True)

    target_year = int(date_str[:4])
    month_day = date_str[5:]  # e.g., "01-01"
    years = range(target_year - 7, target_year)  # 含当前年，共7年

    results_dict = {}

    for year in years:
        date_y = f"{year}-{month_day}"
        print(f"\nSearching GPM_3IMERGDL for {date_y}...")

        # Search the same date
        results = earthaccess.search_data(
            short_name="GPM_3IMERGDL",  # 日产品
            version="07",
            temporal=(date_y, date_y),
            bounding_box=(lon - 5, lat - 5, lon + 5, lat + 5)
        )
        if not results:
            print(f"{date_y}: Cannot find the data。")
            results_dict[year] = None
            continue

        print(f"Found {len(results)} granules, downloading...")
        downloaded_files = earthaccess.download(results, local_path=local_path)

        if not downloaded_files:
            print(f"{date_y}: Fail to download")
            results_dict[year] = None
            continue

        try:
            ds = xr.open_mfdataset(downloaded_files, combine='by_coords')

            lat_idx = np.abs(ds['lat'].values - lat).argmin()
            lon_idx = np.abs(ds['lon'].values - lon).argmin()

            precip_val = ds['precipitation'].isel(time=0, lat=lat_idx, lon=lon_idx).values.item()

            results_dict[year] = precip_val
            print(f"{year}: {precip_val:.3f} mm/hr")

            ds.close()
        except Exception as e:
            print(f"{date_y}: Fail to load - {e}")
            results_dict[year] = None

    # Transfer to pandas.Series
    precip_series = pd.Series(results_dict, name="precip_mm_hr")
    precip_series.index.name = "year"

    # Transfer to pandas.DataFrame
    precip_df = pd.DataFrame(list(results_dict.items()), columns=["year", "precip_mm_hr"])
    precip_df["precip_mm_day"] = precip_df["precip_mm_hr"] * 24  # 转为每日降水量 (mm/day)
    return precip_df


def get_weather(lat, lon, date_str, local_path="./data"):
    # Download Temperature (°C)  Wind speed (m/s)  Cloud-top T (°C)  Pressure (hPa)
    os.makedirs(local_path, exist_ok=True)
    earthaccess.login()

    target_year = int(date_str[:4])
    month_day = date_str[5:]  # Eg: "06-01"
    years = range(target_year - 7, target_year)  # Totally 7 years

    results_dict = {}

    for year in years:
        date_y = f"{year}-{month_day}"
        print(f"\nSearching MERRA-2 for {date_y}...")

        try:
            results = earthaccess.search_data(
                short_name="M2T1NXSLV",   
                version="5.12.4",
                temporal=(date_y, date_y),
                bounding_box=(lon - 5, lat - 5, lon + 5, lat + 5)
            )
            if not results:
                print(f"{date_y}: Cannot find the data")
                continue
            # Download
            downloaded_files = earthaccess.download(results, local_path=local_path)
            if not downloaded_files:
                print(f"{date_y}: Fail to download")
                continue

            # Calculate the average
            ds = xr.open_mfdataset(downloaded_files, combine='by_coords').mean(dim="time")

            # Transfer the unit
            t2m = (ds["T2M"] - 273.15).sel(lat=lat, lon=lon, method="nearest").values.item()
            u10 = ds["U10M"].sel(lat=lat, lon=lon, method="nearest").values.item()
            v10 = ds["V10M"].sel(lat=lat, lon=lon, method="nearest").values.item()
            wind = np.sqrt(u10**2 + v10**2)
            cloudtop = (ds["CLDTMP"] - 273.15).sel(lat=lat, lon=lon, method="nearest").values.item()
            ps = (ds["PS"] / 100).sel(lat=lat, lon=lon, method="nearest").values.item()

            results_dict[year] = {
                "Temperature (°C)": t2m,
                "Wind speed (m/s)": wind,
                "Cloud-top T (°C)": cloudtop,
                "Pressure (hPa)": ps
            }

            print(f"{year}: T={t2m:.2f}°C, Wind={wind:.2f}m/s, CloudTop={cloudtop:.2f}°C, PS={ps:.1f}hPa")

            ds.close()

        except Exception as e:
            print(f"{date_y}: Fail to load - {e}")
            results_dict[year] = None

    # DataFrame
    df = pd.DataFrame.from_dict(results_dict, orient="index").reset_index()
    df.rename(columns={"index": "year"}, inplace=True)
    return df