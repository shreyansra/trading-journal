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
    "leg_role",           # "Core", "Hedge", etc.
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

    # Ensure all columns exist
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            if col in ["entry_date", "exit_date"]:
                df[col] = pd.NaT
            elif col in ["is_open"]:
                df[col] = False
            else:
                df[col] = None

    return df


def save_data(df: pd.DataFrame):
    df.to_csv(DATA_FILE, index=False)


def get_next_fridays(n=12):
    """Return a list of the next n Fridays (standard expiry style)."""
    today = dt.date.today()
    days_ahead = 4 - today.weekday()  # Monday=0 ... Sunday=6, Friday=4
    if days_ahead <= 0:
        days_ahead += 7
    first_friday = today + dt.timedelta(days=days_ahead)
    fridays = [first_friday + dt.timedelta(weeks=i) for i in range(n)]
    return fridays


def fetch_underlying_price(ticker: str):
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

    # Stock PnL
    if row["asset_type"] == "Stock":
        if pd.notnull(row["entry_underlying_px"]) and pd.notnull(row["exit_underlying_px"]):
            return (row["exit_underlying_px"] - row["entry_underlying_px"]) * row["contracts_or_shares"] * direction_mult
        else:
            return None

    # Option PnL
    if row["asset_type"] == "Option":
        if pd.notnull(row["option_entry_price"]) and pd.notnull(row["option_exit_price"]):
            return (row["option_exit_price"] - row["option_entry_price"]) * row["contracts_or_shares"] * 100 * direction_mult
        else:
            return None

    return None


def compute_yearly_summary(df_cat: pd.DataFrame):
    """
    Compute summary metrics per year and overall for a given category subset.
    Returns (yearly_df, overall_row_dict).

    Handles cases where entry_date is missing/invalid by skipping those rows
    gracefully instead of throwing errors.
    """
    cols = [
        "Year", "Total PnL", "Trade Groups", "Winning Groups", "Win Rate",
        "Total Legs", "Long Legs", "Short Legs"
    ]

    # No trades in this category at all
    if df_cat is None or df_cat.empty:
        return pd.DataFrame(columns=cols), None

    # Only closed legs with a PnL
    df_closed = df_cat[(df_cat["is_open"] == False) & (~df_cat["pnl"].isna())].copy()
    if df_closed.empty:
        return pd.DataFrame(columns=cols), None

    # Parse dates safely, drop rows where entry_date is invalid
    df_closed["entry_date"] = pd.to_datetime(df_closed["entry_date"], errors="coerce")
    df_closed = df_closed[~df_closed["entry_date"].isna()]
    if df_closed.empty:
        # Nothing with a valid date to summarize
        return pd.DataFrame(columns=cols), None

    df_closed["entry_year"] = df_closed["entry_date"].dt.year

    # group-level PnL (per year + group_id)
    group_summary = (
        df_closed
        .groupby(["entry_year", "group_id"], dropna=False)
        .agg(group_pnl=("pnl", "sum"))
        .reset_index()
    )

    metrics_rows = []

    # Year-by-year metrics (trade-group level)
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

    # If, for some reason, we still have no rows, return an empty DF instead of crashing
    if metrics_rows:
        yearly_df = pd.DataFrame(metrics_rows).sort_values("Year")
    else:
        yearly_df = pd.DataFrame(columns=cols)

    # Overall metrics across all years (still group-level)
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
    """
    Build portfolio-wide summaries:
    - per year & category
    - per year overall
    - overall totals

    Handles invalid/missing dates gracefully.
    """
    by_cat_year_cols = [
        "Year", "Category", "Total PnL", "Trade Groups",
        "Winning Groups", "Win Rate", "Total Legs",
        "Long Legs", "Short Legs"
    ]
    by_year_cols = [
        "Year", "Total PnL", "Trade Groups", "Winning Groups",
        "Win Rate", "Total Legs", "Long Legs", "Short Legs"
    ]

    if df is None or df.empty:
        return (
            pd.DataFrame(columns=by_cat_year_cols),
            pd.DataFrame(columns=by_year_cols),
            {}
        )

    df_closed = df[(df["is_open"] == False) & (~df["pnl"].isna())].copy()
    if df_closed.empty:
        return (
            pd.DataFrame(columns=by_cat_year_cols),
            pd.DataFrame(columns=by_year_cols),
            {}
        )

    # Parse dates safely, drop invalid ones
    df_closed["entry_date"] = pd.to_datetime(df_closed["entry_date"], errors="coerce")
    df_closed = df_closed[~df_closed["entry_date"].isna()]
    if df_closed.empty:
        return (
            pd.DataFrame(columns=by_cat_year_cols),
            pd.DataFrame(columns=by_year_cols),
            {}
        )

    df_closed["entry_year"] = df_closed["entry_date"].dt.year

    # group-level summary: year + category + group
    group_summary = (
        df_closed
        .groupby(["entry_year", "category", "group_id"], dropna=False)
        .agg(group_pnl=("pnl", "sum"))
        .reset_index()
    )

    # ---------- Per year & category ----------
    rows_by_cat_year = []
    for (year, category), g in group_summary.groupby(["entry_year", "category"], dropna=True):
        year_int = int(year)
        total_pnl = g["group_pnl"].sum()
        trade_groups = len(g)
        winning_groups = (g["group_pnl"] > 0).sum()
        win_rate = winning_groups / trade_groups if trade_groups else 0.0

        df_legs_subset = df_closed[(df_closed["entry_year"] == year_int) & (df_closed["category"] == category)]
        total_legs = len(df_legs_subset)
        long_legs = (df_legs_subset["direction"] == "Long").sum()
        short_legs = (df_legs_subset["direction"] == "Short").sum()

        rows_by_cat_year.append({
            "Year": year_int,
            "Category": category,
            "Total PnL": float(total_pnl),
            "Trade Groups": int(trade_groups),
            "Winning Groups": int(winning_groups),
            "Win Rate": float(win_rate),
            "Total Legs": int(total_legs),
            "Long Legs": int(long_legs),
            "Short Legs": int(short_legs),
        })

    if rows_by_cat_year:
        by_cat_year_df = pd.DataFrame(rows_by_cat_year).sort_values(["Year", "Category"])
    else:
        by_cat_year_df = pd.DataFrame(columns=by_cat_year_cols)

    # ---------- Per year (all categories combined) ----------
    rows_by_year = []
    for year, g in group_summary.groupby("entry_year", dropna=True):
        year_int = int(year)
        total_pnl = g["group_pnl"].sum()
        trade_groups = len(g)
        winning_groups = (g["group_pnl"] > 0).sum()
        win_rate = winning_groups / trade_groups if trade_groups else 0.0

        df_legs_subset = df_closed[df_closed["entry_year"] == year_int]
        total_legs = len(df_legs_subset)
        long_legs = (df_legs_subset["direction"] == "Long").sum()
        short_legs = (df_legs_subset["direction"] == "Short").sum()

        rows_by_year.append({
            "Year": year_int,
            "Total PnL": float(total_pnl),
            "Trade Groups": int(trade_groups),
            "Winning Groups": int(winning_groups),
            "Win Rate": float(win_rate),
            "Total Legs": int(total_legs),
            "Long Legs": int(long_legs),
            "Short Legs": int(short_legs),
        })

    if rows_by_year:
        by_year_df = pd.DataFrame(rows_by_year).sort_values("Year")
    else:
        by_year_df = pd.DataFrame(columns=by_year_cols)

    # ---------- Overall portfolio metrics ----------
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

    return by_cat_year_df, by_year_df, overall



def display_trades_table(df: pd.DataFrame):
    if df.empty:
        st.write("No trades.")
        return

    display_cols = [
        "id",
        "group_id",
        "category",
        "asset_type",
        "ticker",
        "option_type",
        "strike",
        "expiry",
        "contracts_or_shares",
        "direction",
        "leg_role",
        "entry_date",
        "entry_underlying_px",
        "option_entry_price",
        "exit_date",
        "exit_underlying_px",
        "option_exit_price",
        "pnl",
        "comments",
        "is_open",
    ]
    existing = [c for c in display_cols if c in df.columns]
    st.dataframe(df[existing].sort_values("id"), use_container_width=True)


def render_year_journal(category_name: str, year: int, df: pd.DataFrame):
    st.subheader(f"Year {year}")

    # Filter for this category & year for display
    df_cat = df[df["category"] == category_name].copy()
    if not df_cat.empty:
        df_cat["entry_date"] = pd.to_datetime(df_cat["entry_date"], errors="coerce")
        df_cat["entry_year"] = df_cat["entry_date"].dt.year
        df_year = df_cat[df_cat["entry_year"] == year].copy()
    else:
        df_cat = pd.DataFrame(columns=df.columns)
        df_year = df_cat.copy()

    # ------------- New leg / trade form -------------
    st.markdown("### Open a New Leg / Trade")

    with st.form(f"new_trade_form_{category_name}_{year}"):
        cols = st.columns(4)

        with cols[0]:
            # Trade grouping: new core group vs attach leg to existing group
            group_mode = st.radio(
                "Link this leg to",
                ["New core trade", "Existing trade group"],
                key=f"group_mode_{category_name}_{year}"
            )

            asset_type = st.selectbox("Asset type", ["Option", "Stock"], key=f"asset_type_{category_name}_{year}")
            ticker = st.text_input("Ticker (underlying symbol)", value="AAPL", key=f"ticker_{category_name}_{year}").upper().strip()
            direction = st.selectbox("Direction", ["Long", "Short"], key=f"direction_{category_name}_{year}")

        with cols[1]:
            if asset_type == "Option":
                option_type = st.selectbox("Option type", ["Call", "Put"], key=f"option_type_{category_name}_{year}")
                strike = st.number_input("Strike price", min_value=0.0, format="%.2f", key=f"strike_{category_name}_{year}")
                contracts_or_shares = st.number_input("Number of contracts", min_value=1, step=1, key=f"contracts_{category_name}_{year}")
            else:
                option_type = None
                strike = None
                contracts_or_shares = st.number_input("Number of shares", min_value=1, step=1, key=f"shares_{category_name}_{year}")

            expiries = get_next_fridays()
            expiry = st.selectbox(
                "Expiry (for options; ignore for stocks)",
                expiries,
                format_func=lambda d: d.strftime("%Y-%m-%d"),
                key=f"expiry_{category_name}_{year}"
            )

        with cols[2]:
            # Entry date (auto-populated as today but can be overridden)
            today = dt.date.today()
            entry_date = st.date_input(
                "Entry date",
                value=today,
                key=f"entry_date_{category_name}_{year}"
            )

            if st.form_submit_button("Fetch underlying price now"):
                entry_px = fetch_underlying_price(ticker)
                if entry_px is None:
                    st.warning("Couldn't fetch price. Please try again or enter manually below.")
                else:
                    st.session_state[f"last_fetched_price_{category_name}_{year}"] = entry_px
                    st.success(f"Fetched underlying price: {entry_px:.2f}")

            entry_default = float(st.session_state.get(f"last_fetched_price_{category_name}_{year}", 0.0))
            entry_underlying_px = st.number_input(
                "Underlying price at entry",
                value=entry_default,
                format="%.4f",
                key=f"entry_underlying_px_{category_name}_{year}"
            )

        with cols[3]:
            option_entry_price = st.number_input(
                "Option entry price (premium per share; for stocks you can leave 0)",
                min_value=0.0,
                format="%.4f",
                key=f"option_entry_price_{category_name}_{year}"
            )

            # Existing groups for this category
            df_groups = df[df["category"] == category_name].dropna(subset=["group_id"])
            df_groups = df_groups[~df_groups["group_id"].isna()]
            if not df_groups.empty:
                unique_groups = (
                    df_groups
                    .sort_values(["group_id", "entry_date"])
                    .groupby("group_id")
                    .first()
                    .reset_index()
                )

                group_options = [
                    f'{int(row["group_id"])} | {row["ticker"]} | {row["asset_type"]}'
                    for _, row in unique_groups.iterrows()
                ]
                selected_group_label = st.selectbox(
                    "Existing trade group (for additional legs)",
                    options=group_options,
                    key=f"existing_group_{category_name}_{year}"
                )
                selected_group_id = int(selected_group_label.split(" | ")[0])
            else:
                unique_groups = None
                selected_group_label = None
                selected_group_id = None
                st.caption("No existing trade groups yet.")

            # Leg role
            default_leg_role = "Core" if group_mode == "New core trade" else "Hedge"
            leg_role = st.selectbox(
                "Leg role (Core / Hedge / Adjustment)",
                ["Core", "Hedge", "Adjustment"],
                index=["Core", "Hedge", "Adjustment"].index(default_leg_role),
                key=f"leg_role_{category_name}_{year}"
            )

        comments = st.text_area(
            "Comments / trade thesis",
            value="",
            height=80,
            key=f"comments_{category_name}_{year}"
        )

        submitted = st.form_submit_button("Add Leg")

        if submitted:
            if ticker == "":
                st.error("Ticker is required.")
            else:
                # Determine new IDs
                if not df["id"].dropna().empty:
                    next_id = int(df["id"].dropna().max()) + 1
                else:
                    next_id = 1

                if group_mode == "Existing trade group" and selected_group_id is not None:
                    group_id = int(selected_group_id)
                else:
                    max_group = df["group_id"].dropna()
                    next_group_id = int(max_group.max()) + 1 if not max_group.empty else 1
                    group_id = next_group_id

                new_row = {
                    "id": int(next_id),
                    "group_id": int(group_id),
                    "category": category_name,
                    "asset_type": asset_type,
                    "ticker": ticker,
                    "option_type": option_type,
                    "strike": strike,
                    "expiry": expiry if asset_type == "Option" else None,
                    "contracts_or_shares": contracts_or_shares,
                    "direction": direction,
                    "leg_role": leg_role,
                    "entry_date": entry_date,
                    "entry_underlying_px": entry_underlying_px if entry_underlying_px != 0 else None,
                    "option_entry_price": option_entry_price if option_entry_price != 0 else None,
                    "exit_date": pd.NaT,
                    "exit_underlying_px": None,
                    "option_exit_price": None,
                    "pnl": None,
                    "comments": comments,
                    "is_open": True,
                }

                df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
                save_data(df)
                st.success(f"Leg #{next_id} added to trade group {group_id}.")

    # ------------- Close leg form -------------
    st.markdown("### Close an Existing Leg")

    open_trades = df[(df["category"] == category_name) & (df["is_open"] == True)]
    if open_trades.empty:
        st.info("No open legs in this category to close.")
    else:
        with st.form(f"close_trade_form_{category_name}_{year}"):
            col1, col2, col3 = st.columns(3)

            with col1:
                trade_choices = (
                    open_trades["id"].astype(str)
                    + " | G"
                    + open_trades["group_id"].fillna(0).astype(float).astype(int).astype(str)
                    + " | "
                    + open_trades["asset_type"]
                    + " | "
                    + open_trades["ticker"]
                )
                selected_label = st.selectbox(
                    "Select leg to close",
                    trade_choices,
                    key=f"close_select_{category_name}_{year}"
                )
                selected_id = int(selected_label.split(" | ")[0])
                trade_row = df[df["id"] == selected_id].iloc[0]

            with col2:
                if st.form_submit_button("Fetch underlying price (close)"):
                    exit_px = fetch_underlying_price(trade_row["ticker"])
                    if exit_px is None:
                        st.warning("Couldn't fetch price. Please try again or enter manually.")
                    else:
                        st.session_state[f"last_exit_price_{category_name}_{year}"] = exit_px
                        st.success(f"Fetched underlying close price: {exit_px:.2f}")

                exit_default = float(st.session_state.get(f"last_exit_price_{category_name}_{year}", 0.0))
                exit_underlying_px = st.number_input(
                    "Underlying price at exit",
                    value=exit_default,
                    format="%.4f",
                    key=f"exit_underlying_px_{category_name}_{year}"
                )

                exit_date = st.date_input(
                    "Exit date",
                    value=dt.date.today(),
                    key=f"exit_date_{category_name}_{year}"
                )

            with col3:
                option_exit_price = st.number_input(
                    "Option exit price (premium per share; for stocks you can leave 0)",
                    min_value=0.0,
                    format="%.4f",
                    key=f"option_exit_price_close_{category_name}_{year}"
                )
                additional_comments = st.text_area(
                    "Additional closing comments",
                    value="",
                    height=80,
                    key=f"comments_close_{category_name}_{year}"
                )

            close_submitted = st.form_submit_button("Close Leg")

            if close_submitted:
                idx = df.index[df["id"] == selected_id][0]
                df.at[idx, "exit_date"] = exit_date
                df.at[idx, "exit_underlying_px"] = exit_underlying_px if exit_underlying_px != 0 else None
                df.at[idx, "option_exit_price"] = option_exit_price if option_exit_price != 0 else None

                existing_comments = df.at[idx, "comments"]
                if additional_comments.strip():
                    if pd.isna(existing_comments) or existing_comments == "":
                        df.at[idx, "comments"] = additional_comments
                    else:
                        df.at[idx, "comments"] = str(existing_comments) + "\n\n[Close]: " + additional_comments

                df.at[idx, "is_open"] = False

                df.at[idx, "pnl"] = calculate_pnl(df.loc[idx])

                save_data(df)
                pnl_val = df.at[idx, "pnl"]
                if pnl_val is not None:
                    st.success(f"Leg #{selected_id} closed. PnL: {pnl_val:.2f}")
                else:
                    st.success(f"Leg #{selected_id} closed. (PnL not calculated; missing prices.)")

    # ------------- Journal view (this year only) -------------
    st.markdown("### Journal View (this year)")

    if not df_year.empty:
        open_year = df_year[df_year["is_open"] == True]
        closed_year = df_year[df_year["is_open"] == False]
    else:
        open_year = pd.DataFrame(columns=df_cat.columns)
        closed_year = pd.DataFrame(columns=df_cat.columns)

    tab1, tab2, tab3 = st.tabs(["Open Legs", "Closed Legs", "All Legs"])

    with tab1:
        display_trades_table(open_year)

    with tab2:
        display_trades_table(closed_year)

    with tab3:
        display_trades_table(df_year)


def render_category_page(category_name: str):
    st.title(f"{category_name}")

    df = load_data()
    df_cat = df[df["category"] == category_name].copy()

    if df_cat.empty or df_cat["entry_date"].dropna().empty:
        years = [dt.date.today().year]
    else:
        df_cat["entry_date"] = pd.to_datetime(df_cat["entry_date"], errors="coerce")
        years = sorted(df_cat["entry_date"].dropna().dt.year.unique().tolist())

    # One tab per year + a Summary tab
    tabs = st.tabs([str(y) for y in years] + ["Summary"])

    for i, year in enumerate(years):
        with tabs[i]:
            render_year_journal(category_name, year, df)

    # Summary tab for this category
    with tabs[-1]:
        st.subheader("Summary (all years)")
        yearly_summary, overall = compute_yearly_summary(df_cat)
        if yearly_summary.empty:
            st.info("No closed trades with PnL yet for this category.")
        else:
            st.write("Yearly metrics (based on trade groups):")
            st.dataframe(yearly_summary, use_container_width=True)

            if overall:
                st.markdown("#### Overall")
                colA, colB, colC, colD = st.columns(4)
                colA.metric("Total PnL", f"{overall['Total PnL']:.2f}")
                colB.metric("Trade Groups", f"{overall['Trade Groups']}")
                win_rate_pct = overall["Win Rate"] * 100
                colC.metric("Win Rate", f"{win_rate_pct:.1f}%")
                colD.metric("Total Legs", f"{overall['Total Legs']}")
                st.caption("Win rate and counts are computed at the **trade group** level; long/short counts are at the leg level.")
