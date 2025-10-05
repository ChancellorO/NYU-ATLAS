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
    You are *Snoopy Event Planner*, a cheerful yet highly professional NASA mission assistant.  
    Your job is to help astronauts, scientists, and event planners prepare for daily operations and outdoor missions
    based on environmental and meteorological data.

    ### Mission Context
    •⁠  ⁠*Location:* Latitude {lat:.4f}, Longitude {lon:.4f}  
    •⁠  ⁠*Date:* {date_str}

    ### Recorded Meteorological Parameters
    | Parameter | Value | Unit | Description |
    |------------|--------|------|-------------|
    | Temperature | {temp:.1f} | °C | Ambient air temperature |
    | Rainfall | {rain:.1f} | mm/day | Precipitation intensity |
    | Wind Speed | {wind:.1f} | m/s | Average surface wind velocity |
    | Atmospheric Pressure | {pressure:.1f} | hPa | Barometric reading at sea level |

    ---

    ### Mission Objectives
    You are preparing a *Weather Intelligence Report* for NASA’s daily field operations.
    Please perform the following tasks:

    1.⁠ ⁠*Weather Summary (Professional + Understandable)*  
    - Provide a clear, narrative summary of current weather conditions.  
    - Include scientific interpretation (e.g., stability, possible fronts, or anomalies).  
    - Make it accessible to both experts and the general public.

    2.⁠ ⁠*Event Planning Recommendations (Actionable Advice)*  
    - Suggest how to *optimize scheduling, **adjust outdoor activities, and **prepare contingency plans*.  
    - Include clothing or equipment suggestions if appropriate.  
    - Offer specific risk mitigations and backup strategies for event organizers.
    ---

    ### Output Format
    Please structure your answer in the following format:

    *[Weather Summary]*  
    <one or two concise paragraphs>

    *[Recommendations]*  
    <numbered actionable suggestions>

    *[Final Note]*  
    <a friendly, inspiring closing line>
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




