import streamlit as st
import pandas as pd
import datetime as dt
import os
import yfinance as yf

DATA_FILE = "trades_journal.csv"

CATEGORY_BREAKOUT = "Breakout Trades"
CATEGORY_EQUITY_INDEX = "Equity Index Tracking"
CATEGORY_COMMODITY = "Commodity Cycles"
CATEGORY_INCOME = "Income"

REQUIRED_COLUMNS = [
    "id",
    "group_id",
    "category",
    "asset_type",         # "Stock" or "Option"
    "ticker",
    "option_type",        # "Call" or "Put" (for options)
    "strike",
    "expiry",
    "contracts_or_shares",
    "direction",          # "Long" or "Short"
    "leg_role",           # "Core", "Hedge", "Adjustment", etc.
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


def load_data():
    if os.path.exists(DATA_FILE):
        df = pd.read_csv(
            DATA_FILE,
            parse_dates=["entry_date", "exit_date"],
            dayfirst=False
        )
    else:
        df = pd.DataFrame(columns=REQUIRED_COLUMNS)

    # Ensure all expected columns exist
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            if col in ["entry_date", "exit_date"]:
                df[col] = pd.NaT
            elif col == "is_open":
                df[col] = False
            else:
                df[col] = None

    return df


def save_data(df: pd.DataFrame):
    df.to_csv(DATA_FILE, index=False)


def get_next_fridays(n=12):
    """Return a list of the next n Fridays (standard options expiry style)."""
    today = dt.date.today()
    days_ahead = 4 - today.weekday()  # Monday=0 ... Sunday=6, Friday=4
    if days_ahead <= 0:
        days_ahead += 7
    first_friday = today + dt.timedelta(days=days_ahead)
    return [first_friday + dt.timedelta(weeks=i) for i in range(n)]


def fetch_underlying_price(ticker: str):
    """Fetch latest close price for the ticker using yfinance. Returns float or None."""
    if not ticker:
        return None
    try:
        data = yf.Ticker(ticker)
        hist = data.history(period="1d")
        if hist.empty:
            return None
        price = hist["Close"].iloc[-1]
        return float(price)
    except Exception:
        return None


def calculate_pnl(row):
    if pd.isna(row.get("direction")):
        return None

    direction_mult = 1 if row["direction"] == "Long" else -1

    # Stock PnL uses underlying entry/exit prices
    if row["asset_type"] == "Stock":
        if pd.notnull(row["entry_underlying_px"]) and pd.notnull(row["exit_underlying_px"]):
            return (row["exit_underlying_px"] - row["entry_underlying_px"]) * row["contracts_or_shares"] * direction_mult
        else:
            return None

    # Option PnL uses option entry/exit prices (per share * 100 * contracts)
    if row["asset_type"] == "Option":
        if pd.notnull(row["option_entry_price"]) and pd.notnull(row["option_exit_price"]):
            return (row["option_exit_price"] - row["option_entry_price"]) * row["contracts_or_shares"] * 100 * direction_mult
        else:
            return None

    return None


def compute_yearly_summary(df_cat: pd.DataFrame):
    """Compute summary metrics per year and overall for a given category subset."""
    cols = [
        "Year", "Total PnL", "Trade Groups", "Winning Groups", "Win Rate",
        "Total Legs", "Long Legs", "Short Legs"
    ]

    if df_cat is None or df_cat.empty:
        return pd.DataFrame(columns=cols), None

    df_closed = df_cat[(df_cat["is_open"] == False) & (~df_cat["pnl"].isna())].copy()
    if df_closed.empty:
        return pd.DataFrame(columns=cols), None

    df_closed["entry_date"] = pd.to_datetime(df_closed["entry_date"], errors="coerce")
    df_closed = df_closed[~df_closed["entry_date"].isna()]
    if df_closed.empty:
        return pd.DataFrame(columns=cols), None

    df_closed["entry_year"] = df_closed["entry_date"].dt.year

    group_summary = (
        df_closed
        .groupby(["entry_year", "group_id"], dropna=False)
        .agg(group_pnl=("pnl", "sum"))
        .reset_index()
    )

    metrics_rows = []
    for year, year_groups in group_summary.groupby("entry_year", dropna=True):
        year_int = int(year)
        total_pnl = year_groups["group_pnl"].sum()
        trade_groups = len(year_groups)
        winning_groups = (year_groups["group_pnl"] > 0).sum()
        win_rate = winning_groups / trade_groups if trade_groups else 0.0

        df_year_legs = df_closed[df_closed["entry_year"] == year_int]
        total_legs = len(df_year_legs)
        long_legs = (df_year_legs["direction"] == "Long").sum()
        short_legs = (df_year_legs["direction"] == "Short").sum()

        metrics_rows.append({
            "Year": year_int,
            "Total PnL": float(total_pnl),
            "Trade Groups": int(trade_groups),
            "Winning Groups": int(winning_groups),
            "Win Rate": float(win_rate),
            "Total Legs": int(total_legs),
            "Long Legs": int(long_legs),
            "Short Legs": int(short_legs),
        })

    if metrics_rows:
        yearly_df = pd.DataFrame(metrics_rows).sort_values("Year")
    else:
        yearly_df = pd.DataFrame(columns=cols)

    total_pnl_all = group_summary["group_pnl"].sum()
    trade_groups_all = len(group_summary)
    winning_groups_all = (group_summary["group_pnl"] > 0).sum()
    win_rate_all = winning_groups_all / trade_groups_all if trade_groups_all else 0.0

    total_legs_all = len(df_closed)
    long_legs_all = (df_closed["direction"] == "Long").sum()
    short_legs_all = (df_closed["direction"] == "Short").sum()

    overall = {
        "Total PnL": float(total_pnl_all),
        "Trade Groups": int(trade_groups_all),
        "Winning Groups": int(winning_groups_all),
        "Win Rate": float(win_rate_all),
        "Total Legs": int(total_legs_all),
        "Long Legs": int(long_legs_all),
        "Short Legs": int(short_legs_all),
    }

    return yearly_df, overall


def compute_portfolio_summary(df: pd.DataFrame):
    """Build portfolio-wide summaries per year/category and overall."""
