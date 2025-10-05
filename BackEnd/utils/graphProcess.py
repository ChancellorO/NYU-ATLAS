import plotly.io as pio
import json

def fig_to_json(fig):
    fig_json = pio.to_json(fig)
    return fig_json
