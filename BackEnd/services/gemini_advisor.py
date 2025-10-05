import os
from google import genai
from google.genai import types

def generate_gemini_advice(predict_table, lat, lon, date_str):
    # init the server
    client = genai.Client(api_key="Your Own Google Gemini API")

    model = "gemini-2.0-flash-exp"
    forecast = predict_table.iloc[-1].to_dict()

    temp = forecast.get("Temperature (°C)", 0)
    rain = forecast.get("precip_mm_day", 0)
    wind = forecast.get("Wind speed (m/s)", 0)
    pressure = forecast.get("Pressure (hPa)", 0)

    user_prompt = f"""
    You are "Snoopy Event Planner", a cheerful NASA mission assistant.
    Location: lat={lat}, lon={lon}
    Date: {date_str}

    Temperature: {temp:.1f} °C
    Rainfall: {rain:.1f} mm/day
    Wind speed: {wind:.1f} m/s
    Pressure: {pressure:.1f} hPa

    Please:
    1. Summarize the weather so that everyone can understand it
    2. Give you some advice
    """

    contents = [
        types.Content(
            role="user",
            parts=[types.Part(text=user_prompt)]  
        )
    ]

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            temperature=0.8,
            max_output_tokens=250
        )
    )

    output_text = response.candidates[0].content.parts[0].text
    return {"gemini_advice": output_text}




