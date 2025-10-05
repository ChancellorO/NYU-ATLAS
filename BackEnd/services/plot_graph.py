import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd

def plot_precipitation_bar(df, date_str):
    month_day = date_str[5:]  # Get "MM-DD"

    # Bar Chart
    fig = px.bar(
        df,
        x="year",
        y="precip_mm_day",
        text=df["precip_mm_day"].round(2),
        title=f"Daily Precipitation on {month_day} (mm/day)",
        labels={"precip_mm_day": "Precipitation (mm/day)", "year": "year"},
        color="precip_mm_day",
        color_continuous_scale="Blues"
    )

    # Fill Style
    fig.update_traces(textposition="outside")
    fig.update_layout(
        template="plotly_white",
        title_font_size=20,
        xaxis=dict(tickmode="linear"),
        yaxis_title="Daily Precipitation (mm/day)",
        coloraxis_showscale=False
    )
    fig.show()
    return fig



def plot_weather(df, date_str):
    month_day = date_str[5:]

    variables = [
        ("Temperature (°C)", "red"),
        ("Wind speed (m/s)", "blue"),
        ("Cloud-top T (°C)", "purple"),
        ("Pressure (hPa)", "green")
    ]

    # Create subplots
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=[v[0] for v in variables],
        horizontal_spacing=0.12,
        vertical_spacing=0.15
    )

    # Create the line chart
    for i, (var, color) in enumerate(variables):
        row = i // 2 + 1
        col = i % 2 + 1
        fig.add_trace(
            go.Scatter(
                x=df["year"],
                y=df[var],
                mode="lines+markers+text",
                text=[f"{y:.2f}" for y in df[var]],
                textposition="top center",
                line=dict(color=color, width=3),
                marker=dict(size=8, line=dict(width=1, color="black")),
                name=var
            ),
            row=row,
            col=col
        )

    # Fill Style
    fig.update_layout(
        template="plotly_white",
        title={
            "text": f"Weather Trends on {month_day} (2013–2019)",
            "x": 0.5,
            "xanchor": "center",
            "font": dict(size=22)
        },
        showlegend=False,
        height=800,
        width=1000
    )

    fig.update_xaxes(showgrid=True, tickmode="linear")
    fig.update_yaxes(showgrid=True)

    fig.show()
    return fig


def plot_weather_probabilities(events):
    # Percentage
    categories = list(events.keys())
    probabilities = [round(v * 100, 1) for v in events.values()]

    # color=high temperature, blue=rain, purple=storm, grey=snow
    color_map = {
        "Extreme Heat": "#ef476f",
        "Rain": "#118ab2",
        "Snow": "#adb5bd",
        "Thunderstorm": "#8338ec"
    }
    colors = [color_map.get(cat, "#06d6a0") for cat in categories]

    # bar chat
    fig = go.Figure(go.Bar(
        x=categories,
        y=probabilities,
        text=[f"{p}%" for p in probabilities],
        textposition="outside",
        marker_color=colors
    ))

    # layout
    fig.update_layout(
        title="Weather Probabilities",
        xaxis_title="Weather Event",
        yaxis_title="Probability (%)",
        yaxis=dict(range=[0, 100]),
        template="plotly_white",
        font=dict(size=14),
        height=500,
        width=700
    )

    fig.show()
    return fig


def plot_map(lat, lon, forecast_df):

    required_cols = ["Temperature (°C)", "precip_mm_day", "Wind speed (m/s)", "Pressure (hPa)"]
    for col in required_cols:
        if col not in forecast_df.columns:
            raise ValueError(f"Missing column: {col}")

    # Prediction Row
    latest = forecast_df.iloc[-1]

    # Build DataFrame
    df = pd.DataFrame({
        "lat": [lat],
        "lon": [lon],
        "Temperature (°C)": [round(latest["Temperature (°C)"], 2)],
        "Precipitation (mm/day)": [round(latest["precip_mm_day"], 2)],
        "Wind speed (m/s)": [round(latest["Wind speed (m/s)"], 2)],
        "Pressure (hPa)": [round(latest["Pressure (hPa)"], 2)]
    })

    # Create a sample map
    fig = px.scatter_mapbox(
        df,
        lat="lat",
        lon="lon",
        size="Precipitation (mm/day)",
        size_max=30,
        hover_data={
            "Temperature (°C)": True,
            "Precipitation (mm/day)": True,
            "Wind speed (m/s)": True,
            "Pressure (hPa)": True,
            "lat": False,
            "lon": False
        },
        zoom=10,
    )

    # Set the style
    fig.update_traces(
        marker=dict(
            size=10,
            color="blue",      
            opacity=0.8
        ),
        hovertemplate=(
            "<b>Predicted Weather</b><br>"
            "Temperature: %{customdata[0]:.2f} °C<br>"
            "Precipitation: %{customdata[1]:.2f} mm/day<br>"
            "Wind Speed: %{customdata[2]:.2f} m/s<br>"
            "Pressure: %{customdata[3]:.2f} hPa<br>"
            "<extra></extra>"
        )
    )

    fig.update_layout(
        mapbox_style="carto-positron",
        margin={"r":0, "t":30, "l":0, "b":0}
    )

    fig.show()
    return fig