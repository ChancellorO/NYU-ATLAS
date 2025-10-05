import pandas as pd
import json
from datetime import datetime

def merge_precip_weather(precip_df, weather_df):

    merged_df = pd.merge(precip_df, weather_df, on="year", how="outer")
    merged_df.sort_values("year", inplace=True)
    merged_df.reset_index(drop=True, inplace=True)
    
    # Style
    columns_order = [
        "year",
        "precip_mm_hr",
        "precip_mm_day",
        "Temperature (°C)",
        "Wind speed (m/s)",
        "Cloud-top T (°C)",
        "Pressure (hPa)"
    ]
    merged_df = merged_df[[col for col in columns_order if col in merged_df.columns]]

    return merged_df

def compute_event_probabilities(df):
    """
    Based on the history data to predict the probability
    """
    events = {}

    # High Temperature
    events["Extreme Heat"] = (df["Temperature (°C)"] > 30).mean()

    # Rain Probability
    events["Rain"] = (df["precip_mm_day"] >= 0.01).mean()

    # Snow
    events["Snow"] = (df["Temperature (°C)"] < 5).mean()

    # Rainstorm
    events["Thunderstorm"] = ((df["precip_mm_day"] > 5) & (df["Cloud-top T (°C)"] < -30)).mean()

    return events

def detect_weather_conditions(predict_table):
    if isinstance(predict_table, pd.DataFrame):
        data = predict_table.iloc[0]
    elif isinstance(predict_table, pd.Series):
        data = predict_table
    elif isinstance(predict_table, dict):
        data = pd.Series(predict_table)
    else:
        raise TypeError("predict_table must be dict, pd.Series or pd.DataFrame")

    temp = data.get("Temperature (°C)", 0)
    precip = data.get("precip_mm_day", 0)
    cloud_top_t = data.get("Cloud-top T (°C)", 0)

    events = {
        "Extreme Heat": temp > 30,
        "Rain": precip >= 0.01,
        "Snow": temp < 5,
        "Thunderstorm": (precip > 5) & (cloud_top_t < -30)
    }

    events = {k: bool(v) for k, v in events.items()}

    return events

def df_to_json(df):
    json_obj = {
        "columns": list(df.columns),
        "data": json.loads(df.to_json(orient="records", date_format="iso", force_ascii=False))
    }
    return json_obj

def is_future_date(date_str: str) -> bool:
    try:
        input_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = datetime.now().date()

        return input_date > today
    except ValueError:
        raise ValueError("Invalid date format")

