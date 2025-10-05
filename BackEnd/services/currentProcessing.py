import numpy as np
from pmdarima import auto_arima
import pandas as pd
import os
import earthaccess
import xarray as xr

def forecast_next_year_arima(df):
    results = {}
    years = df["year"].values
    next_year = years.max() + 1

    for col in ["Temperature (°C)", "precip_mm_day", "Wind speed (m/s)", "Pressure (hPa)"]:
        series = df[col].astype(float)

        # Automatically select the optimal (p, d, q)
        model = auto_arima(series, seasonal=False, trace=False, error_action="ignore", suppress_warnings=True)

        # predict the date
        forecast, conf_int = model.predict(n_periods=1, return_conf_int=True)

        forecast_val = float(np.squeeze(forecast))
        lower_val = float(conf_int.ravel()[0])
        upper_val = float(conf_int.ravel()[1])

        results[col] = {
            "pred": forecast_val,
            "lower": lower_val,
            "upper": upper_val
        }

        print(f"{col}: {next_year} → {forecast_val:.2f} (95% CI [{lower_val:.2f}, {upper_val:.2f}])")

    forecast_df = {
        "year": [next_year],
        "Temperature (°C)": [results["Temperature (°C)"]["pred"]],
        "precip_mm_day": [results["precip_mm_day"]["pred"]],
        "Wind speed (m/s)": [results["Wind speed (m/s)"]["pred"]],
        "Pressure (hPa)": [results["Pressure (hPa)"]["pred"]],
    }

    return pd.DataFrame(forecast_df)



def download_historical_data(lat, lon, date_str, local_path="./previous"):

    os.makedirs(local_path, exist_ok=True)

    precip_val = None
    results = earthaccess.search_data(
        short_name="GPM_3IMERGDL",
        version="07",
        temporal=(date_str, date_str),
        bounding_box=(lon - 5, lat - 5, lon + 5, lat + 5)
    )

    if results:
        downloaded_files = earthaccess.download(results, local_path=local_path)
        ds = xr.open_mfdataset(downloaded_files, combine="by_coords")

        # find the nearest point
        lat_idx = np.abs(ds["lat"].values - lat).argmin()
        lon_idx = np.abs(ds["lon"].values - lon).argmin()

        # mm/hr → mm/day
        precip_val = ds["precipitation"].isel(time=0, lat=lat_idx, lon=lon_idx).values.item() * 24
        ds.close()
        print(f"Precipitation: {precip_val:.2f} mm/day")
    else:
        print(f"No GPM data found for {date_str}")

    t2m = wind = ps = None
    results2 = earthaccess.search_data(
        short_name="M2T1NXSLV",
        version="5.12.4",
        temporal=(date_str, date_str),
        bounding_box=(lon - 5, lat - 5, lon + 5, lat + 5)
    )

    if results2:
        downloaded_files2 = earthaccess.download(results2, local_path=local_path)
        ds2 = xr.open_mfdataset(downloaded_files2, combine="by_coords").mean(dim="time")

        t2m = float((ds2["T2M"] - 273.15).sel(lat=lat, lon=lon, method="nearest").values.item())
        u10 = float(ds2["U10M"].sel(lat=lat, lon=lon, method="nearest").values.item())
        v10 = float(ds2["V10M"].sel(lat=lat, lon=lon, method="nearest").values.item())
        wind = np.sqrt(u10**2 + v10**2)
        ps = float((ds2["PS"] / 100).sel(lat=lat, lon=lon, method="nearest").values.item())

        ds2.close()
        print(f"Temperature: {t2m:.2f} °C, Wind: {wind:.2f} m/s, Pressure: {ps:.1f} hPa")
    else:
        print(f"No MERRA-2 data found for {date_str}")

    result = {
        "year": date_str,
        "Temperature (°C)": t2m,
        "Wind speed (m/s)": wind,
        "Pressure (hPa)": ps,
        "precip_mm_day": precip_val
    }

    return pd.DataFrame([result])
