from services.download_data import get_precipitation,get_weather
from services.plot_graph import plot_precipitation_bar, plot_weather, plot_weather_probabilities,plot_map
from services.currentProcessing import forecast_next_year_arima,download_historical_data
from services.gemini_advisor import generate_gemini_advice

from utils.DataProcess import merge_precip_weather,compute_event_probabilities, detect_weather_conditions,is_future_date
from utils.collectionJson import to_json_full_package

def generate_package(lat, lon, date_str):

    # Step 1: Download historical weather data
    weather_7yrs = get_weather(lat=lat, lon=lon, date_str=date_str)
    precip_7yrs = get_precipitation(lat=lat, lon=lon, date_str=date_str)

    # Step 2: Merge & Predict
    final_table = merge_precip_weather(precip_7yrs, weather_7yrs)


    if is_future_date(date_str):
        predict_table = forecast_next_year_arima(final_table)
    else:
        predict_table = download_historical_data(lat, lon, date_str)


    # Step 3: Gemini chatbot advice
    gemini_result = generate_gemini_advice(predict_table, lat, lon, date_str)

    # Step 4: Detect boolean events
    result = detect_weather_conditions(predict_table)

    # Step 5: Visualization

    map = plot_map(lat,lon,predict_table)
    prob = compute_event_probabilities(final_table)
    fig_prob = plot_weather_probabilities(prob)
    fig_precip = plot_precipitation_bar(precip_7yrs, date_str)
    fig_weather = plot_weather(weather_7yrs, date_str)

    # Step 6: Combine all into JSON-ready package
    package = to_json_full_package(
        dfs={
            "merged": final_table,
            "forecast": predict_table
        },
        figs={
            "previous precipitation": fig_precip,
            "weather trend": fig_weather,
            "probability": fig_prob,
            "map":map
        },
        chatbot=gemini_result.get("gemini_advice"),
        events=result
    )

    return package