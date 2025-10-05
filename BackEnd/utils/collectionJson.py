from utils.DataProcess import df_to_json
from utils.graphProcess import fig_to_json

def to_json_full_package(dfs=None, figs=None, chatbot=None, events=None):
    package = {}

    if dfs:
        package["tables"] = {name: df_to_json(df) for name, df in dfs.items()}

    if figs:
        package["figures"] = {name: fig_to_json(fig) for name, fig in figs.items()}

    if chatbot:
        package["chatbot"] = chatbot if isinstance(chatbot, str) else str(chatbot)

    if events:
        package["events"] = {k: bool(v) for k, v in events.items()}

    return package


