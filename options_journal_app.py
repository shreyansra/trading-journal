import streamlit as st
import pandas as pd
import datetime as dt
import os
import yfinance as yf

# =========================
# Config
# =========================
DATA_FILE = "trades_journal.csv"

# =========================
# Helper functions
# =========================

def load_data():
    if os.path.exists(DATA_FILE):
        df = pd.read_csv(DATA_FILE, parse_dates=["entry_date", "exit_date"], dayfirst=False)
    else:
        df = pd.DataFrame(
            columns=[
                "id",
                "asset_type",         # "Stock" or "Option"
                "ticker",
                "option_type",        # "Call" or "Put" (for options)
                "strike",
                "expiry",
                "contracts_or_shares",
                "direction",          # "Long" or "Short"
                "entry_date",
                "entry_underlying_px",
                "option_entry_price",
                "exit_date",
                "exit_underlying_px",
                "option_exit_price",
                "pnl",
                "comments",
                "is_open"
            ]
        )
    return df


def save_data(df: pd.DataFrame):
    df.to_csv(DATA_FILE, index=False)


def get_next_fridays(n=12):
    """Return a list of the next n Fridays (standard expiry style)."""
    today = dt.date.today()
    # Find next Friday
    days_ahead = 4 - today.weekday()  # Monday=0 ... Sunday=6, Friday=4
    if days_ahead <= 0:
        days_ahead += 7
    first_friday = today + dt.timedelta(days=days_ahead)
    fridays = [first_friday + dt.timedelta(weeks=i) for i in range(n)]
    return fridays


def fetch_underlying_price(ticker: str):
    try:
        data = yf.Ticker(ticker)
        price = data.history(period="1d")["Close"].iloc[-1]
        return float(price)
    except Exception:
        return None


def calculate_pnl(row):
    direction_mult = 1 if row["direction"] == "Long" else -1

    # Stock PnL
    if row["asset_type"] == "Stock":
        if pd.notnull(row["entry_underlying_px"]) and pd.notnull(row["exit_underlying_px"]):
            return (row["exit_underlying_px"] - row["entry_underlying_px"]) * row["contracts_or_shares"] * direction_mult
        else:
            return None

    # Option PnL
    if row["asset_type"] == "Option":
        if pd.notnull(row["option_entry_price"]) and pd.notnull(row["option_exit_price"]):
            # Options are usually quoted per share; 1 contract = 100 shares
            return (row["option_exit_price"] - row["option_entry_price"]) * row["contracts_or_shares"] * 100 * direction_mult
        else:
            return None

    return None


# =========================
# Streamlit UI
# =========================

st.set_page_config(page_title="Trading Journal", layout="wide")
st.title("📓 Options & Stock Trading Journal")

df = load_data()

# Sidebar for general info
st.sidebar.header("Summary")
open_trades = df[df["is_open"] == True]
closed_trades = df[df["is_open"] == False]

st.sidebar.write(f"Open trades: **{len(open_trades)}**")
st.sidebar.write(f"Closed trades: **{len(closed_trades)}**")

total_pnl = closed_trades["pnl"].sum() if not closed_trades.empty else 0
st.sidebar.write(f"Total realized PnL: **{total_pnl:,.2f}**")

# =========================
# New Trade Entry
# =========================

st.header("➕ Open a New Trade")

with st.form("new_trade_form"):
    cols = st.columns(3)

    with cols[0]:
        asset_type = st.selectbox("Asset type", ["Option", "Stock"])
        ticker = st.text_input("Ticker (underlying symbol)", value="AAPL").upper().strip()
        direction = st.selectbox("Direction", ["Long", "Short"])

    with cols[1]:
        if asset_type == "Option":
            option_type = st.selectbox("Option type", ["Call", "Put"])
            strike = st.number_input("Strike price", min_value=0.0, format="%.2f")
            contracts_or_shares = st.number_input("Number of contracts", min_value=1, step=1)
        else:
            option_type = None
            strike = None
            contracts_or_shares = st.number_input("Number of shares", min_value=1, step=1)

        expiries = get_next_fridays()
        expiry = st.selectbox("Expiry (for options; ignore for stocks)", expiries, format_func=lambda d: d.strftime("%Y-%m-%d"))

    with cols[2]:
        # Fetch underlying price at entry
        if st.form_submit_button("Fetch underlying price now"):
            entry_px = fetch_underlying_price(ticker)
            if entry_px is None:
                st.warning("Couldn't fetch price. Please try again or enter manually below.")
            else:
                st.session_state["last_fetched_price"] = entry_px
                st.success(f"Fetched underlying price: {entry_px:.2f}")

        entry_default = st.session_state.get("last_fetched_price", 0.0)
        entry_underlying_px = st.number_input("Underlying price at entry", value=float(entry_default), format="%.4f")

        option_entry_price = st.number_input(
            "Option entry price (premium per share; for stocks you can leave 0)",
            min_value=0.0,
            format="%.4f"
        )

    comments = st.text_area("Comments / trade thesis", value="", height=80)

    submitted = st.form_submit_button("Add Trade")

    if submitted:
        if ticker == "":
            st.error("Ticker is required.")
        else:
            new_id = (df["id"].max() + 1) if not df.empty else 1
            entry_date = dt.date.today()

            new_row = {
                "id": int(new_id),
                "asset_type": asset_type,
                "ticker": ticker,
                "option_type": option_type,
                "strike": strike,
                "expiry": expiry if asset_type == "Option" else None,
                "contracts_or_shares": contracts_or_shares,
                "direction": direction,
                "entry_date": entry_date,
                "entry_underlying_px": entry_underlying_px if entry_underlying_px != 0 else None,
                "option_entry_price": option_entry_price if option_entry_price != 0 else None,
                "exit_date": pd.NaT,
                "exit_underlying_px": None,
                "option_exit_price": None,
                "pnl": None,
                "comments": comments,
                "is_open": True
            }

            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
            save_data(df)
            st.success(f"Trade #{new_id} added.")


# =========================
# Close Trade
# =========================

st.header("✅ Close an Existing Trade")

if open_trades.empty:
    st.info("No open trades to close.")
else:
    with st.form("close_trade_form"):
        col1, col2, col3 = st.columns(3)

        with col1:
            trade_choices = open_trades["id"].astype(str) + " | " + open_trades["asset_type"] + " | " + open_trades["ticker"]
            selected_label = st.selectbox("Select trade to close", trade_choices)
            selected_id = int(selected_label.split(" | ")[0])
            trade_row = df[df["id"] == selected_id].iloc[0]

        with col2:
            # Fetch underlying exit price
            if st.form_submit_button("Fetch underlying price (close)"):
                exit_px = fetch_underlying_price(trade_row["ticker"])
                if exit_px is None:
                    st.warning("Couldn't fetch price. Please try again or enter manually.")
                else:
                    st.session_state["last_exit_price"] = exit_px
                    st.success(f"Fetched underlying close price: {exit_px:.2f}")

            exit_default = st.session_state.get("last_exit_price", 0.0)
            exit_underlying_px = st.number_input(
                "Underlying price at exit",
                value=float(exit_default),
                format="%.4f"
            )

        with col3:
            option_exit_price = st.number_input(
                "Option exit price (premium per share; for stocks you can leave 0)",
                min_value=0.0,
                format="%.4f"
            )
            additional_comments = st.text_area("Additional closing comments", value="", height=80)

        close_submitted = st.form_submit_button("Close Trade")

        if close_submitted:
            idx = df.index[df["id"] == selected_id][0]
            df.at[idx, "exit_date"] = dt.date.today()
            df.at[idx, "exit_underlying_px"] = exit_underlying_px if exit_underlying_px != 0 else None
            df.at[idx, "option_exit_price"] = option_exit_price if option_exit_price != 0 else None

            # Merge comments
            existing_comments = df.at[idx, "comments"]
            if additional_comments.strip():
                if pd.isna(existing_comments) or existing_comments == "":
                    df.at[idx, "comments"] = additional_comments
                else:
                    df.at[idx, "comments"] = existing_comments + "\n\n[Close]: " + additional_comments

            df.at[idx, "is_open"] = False

            # Recalculate PnL
            df.at[idx, "pnl"] = calculate_pnl(df.loc[idx])

            save_data(df)
            st.success(f"Trade #{selected_id} closed. PnL: {df.at[idx, 'pnl']:.2f}" if df.at[idx, "pnl"] is not None else f"Trade #{selected_id} closed.")


# =========================
# View Journal
# =========================

st.header("📈 Journal View")

tab1, tab2, tab3 = st.tabs(["Open Trades", "Closed Trades", "All Trades"])

def display_df(dframe):
    if dframe.empty:
        st.write("No data.")
    else:
        display_cols = [
            "id",
            "asset_type",
            "ticker",
            "option_type",
            "strike",
            "expiry",
            "contracts_or_shares",
            "direction",
            "entry_date",
            "entry_underlying_px",
            "option_entry_price",
            "exit_date",
            "exit_underlying_px",
            "option_exit_price",
            "pnl",
            "comments",
        ]
        existing = [c for c in display_cols if c in dframe.columns]
        st.dataframe(dframe[existing].sort_values("id"), use_container_width=True)

with tab1:
    display_df(open_trades)

with tab2:
    display_df(closed_trades)

with tab3:
    display_df(df)
