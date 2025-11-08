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

def _trigger_rerun():
    """Force Streamlit to reload the script so new data shows up immediately."""
    try:
        # Newer Streamlit versions
        st.rerun()
    except Exception:
        # Older versions
        try:
            st.experimental_rerun()
        except Exception:
            pass

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

    df_closed["entry_date"] = pd.to_datetime(df_closed["entry_date"], errors="coerce")
    df_closed = df_closed[~df_closed["entry_date"].isna()]
    if df_closed.empty:
        return (
            pd.DataFrame(columns=by_cat_year_cols),
            pd.DataFrame(columns=by_year_cols),
            {}
        )

    df_closed["entry_year"] = df_closed["entry_date"].dt.year

    group_summary = (
        df_closed
        .groupby(["entry_year", "category", "group_id"], dropna=False)
        .agg(group_pnl=("pnl", "sum"))
        .reset_index()
    )

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


def _sorted_for_display(df: pd.DataFrame) -> pd.DataFrame:
    """Sort so that within each group, Core legs appear first, then others."""
    if df.empty:
        return df

    df = df.copy()
    role_order_map = {"Core": 0, "Hedge": 1, "Adjustment": 2}
    df["__role_order"] = df["leg_role"].map(role_order_map).fillna(9)
    df["__group_order"] = df["group_id"].fillna(1e9)

    df = df.sort_values(["__group_order", "__role_order", "id"])
    return df.drop(columns=["__role_order", "__group_order"])


def display_trades_table(df: pd.DataFrame):
    if df.empty:
        st.write("No trades.")
        return

    df_disp = _sorted_for_display(df)

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
    existing = [c for c in display_cols if c in df_disp.columns]
    st.dataframe(df_disp[existing], use_container_width=True, height=280)


def render_year_journal(category_name: str, year: int, df: pd.DataFrame):
    st.markdown(f"### {category_name} – {year}")

    # Filter data for this category & year
    df_cat = df[df["category"] == category_name].copy()
    if not df_cat.empty:
        df_cat["entry_date"] = pd.to_datetime(df_cat["entry_date"], errors="coerce")
        df_year = df_cat[df_cat["entry_date"].dt.year == year].copy()
    else:
        df_year = pd.DataFrame(columns=df.columns)

    # ---------- New leg / trade ----------
    st.markdown("#### New Leg / Trade")

    with st.form(f"new_trade_form_{category_name}_{year}"):
        c1, c2, c3 = st.columns([1.1, 1.1, 1.2])

        with c1:
            group_mode = st.radio(
                "Link this leg to",
                ["New core trade", "Existing trade group"],
                key=f"group_mode_{category_name}_{year}",
                horizontal=True,
            )

            asset_type = st.selectbox(
                "Asset type",
                ["Option", "Stock"],
                key=f"asset_type_{category_name}_{year}",
            )
            ticker = st.text_input(
                "Ticker",
                value="AAPL",
                key=f"ticker_{category_name}_{year}",
            ).upper().strip()
            direction = st.selectbox(
                "Direction",
                ["Long", "Short"],
                key=f"direction_{category_name}_{year}",
            )

        with c2:
            if asset_type == "Option":
                option_type = st.selectbox(
                    "Option type",
                    ["Call", "Put"],
                    key=f"option_type_{category_name}_{year}",
                )
                strike = st.number_input(
                    "Strike",
                    min_value=0.0,
                    format="%.2f",
                    key=f"strike_{category_name}_{year}",
                )
                qty = st.number_input(
                    "Contracts",
                    min_value=1,
                    step=1,
                    key=f"contracts_{category_name}_{year}",
                )
            else:
                option_type = None
                strike = None
                qty = st.number_input(
                    "Shares",
                    min_value=1,
                    step=1,
                    key=f"shares_{category_name}_{year}",
                )

            expiries = get_next_fridays()
            expiry = st.selectbox(
                "Expiry (options)",
                expiries,
                format_func=lambda d: d.strftime("%Y-%m-%d"),
                key=f"expiry_{category_name}_{year}",
            )

            entry_date = st.date_input(
                "Entry date",
                value=dt.date.today(),
                key=f"entry_date_{category_name}_{year}",
            )

        with c3:
            selected_group_id = None
            if group_mode == "Existing trade group":
                # Use all data for this category (not just this year) to list groups
                df_all_for_groups = load_data()
                df_groups = df_all_for_groups[df_all_for_groups["category"] == category_name]
                df_groups = df_groups.dropna(subset=["group_id"])
                if not df_groups.empty:
                    unique_groups = (
                        df_groups.sort_values(["group_id", "entry_date"])
                        .groupby("group_id")
                        .first()
                        .reset_index()
                    )
                    group_options = [
                        f'{int(row["group_id"])} | {row["ticker"]} | {row["asset_type"]}'
                        for _, row in unique_groups.iterrows()
                    ]
                    selected_group_label = st.selectbox(
                        "Existing trade group",
                        options=group_options,
                        key=f"existing_group_{category_name}_{year}",
                    )
                    selected_group_id = int(selected_group_label.split(" | ")[0])
                else:
                    st.info("No existing trade groups yet in this category.")

            leg_role_default = "Core" if group_mode == "New core trade" else "Hedge"
            leg_role = st.selectbox(
                "Leg role",
                ["Core", "Hedge", "Adjustment"],
                index=["Core", "Hedge", "Adjustment"].index(leg_role_default),
                key=f"leg_role_{category_name}_{year}",
            )

            if asset_type == "Option":
                option_entry_price = st.number_input(
                    "Option entry price (premium per share)",
                    min_value=0.0,
                    format="%.4f",
                    key=f"option_entry_price_{category_name}_{year}",
                )
            else:
                option_entry_price = 0.0

        comments = st.text_area(
            "Comments / thesis",
            value="",
            height=60,
            key=f"comments_{category_name}_{year}",
        )

        submitted = st.form_submit_button("Add leg")

        if submitted:
            if ticker == "":
                st.warning("Ticker is required.")
            else:
                df_all = load_data()

                if not df_all["id"].dropna().empty:
                    next_id = int(df_all["id"].dropna().max()) + 1
                else:
                    next_id = 1

                if group_mode == "Existing trade group" and selected_group_id is not None:
                    group_id = int(selected_group_id)
                else:
                    max_group = df_all["group_id"].dropna()
                    group_id = int(max_group.max()) + 1 if not max_group.empty else 1

                entry_underlying_px = fetch_underlying_price(ticker)

                new_row = {
                    "id": int(next_id),
                    "group_id": int(group_id),
                    "category": category_name,
                    "asset_type": asset_type,
                    "ticker": ticker,
                    "option_type": option_type,
                    "strike": strike,
                    "expiry": expiry if asset_type == "Option" else None,
                    "contracts_or_shares": qty,
                    "direction": direction,
                    "leg_role": leg_role,
                    "entry_date": entry_date,
                    "entry_underlying_px": entry_underlying_px,
                    "option_entry_price": option_entry_price if asset_type == "Option" and option_entry_price != 0 else None,
                    "exit_date": pd.NaT,
                    "exit_underlying_px": None,
                    "option_exit_price": None,
                    "pnl": None,
                    "comments": comments,
                    "is_open": True,
                }

                df_all = pd.concat([df_all, pd.DataFrame([new_row])], ignore_index=True)
                save_data(df_all)
                if entry_underlying_px is not None:
                    st.success(
                        f"Leg #{next_id} added to trade group {group_id}. "
                        f"(Entry underlying: {entry_underlying_px:.2f})"
                    )
                else:
                    st.success(f"Leg #{next_id} added to trade group {group_id}.")

                _trigger_rerun()

    
    # ---------- Journal View (this year) ----------
    st.markdown("#### Journal View (this year)")

    if not df_year.empty:
        open_year = df_year[df_year["is_open"] == True]
        closed_year = df_year[df_year["is_open"] == False]
    else:
        open_year = pd.DataFrame(columns=df.columns)
        closed_year = pd.DataFrame(columns=df.columns)

    tab_open, tab_closed, tab_all = st.tabs(["Open legs", "Closed legs", "All legs"])

    # --- Open legs tab with row-level close/edit buttons ---
    with tab_open:
        st.caption("Open legs for this category and year. Core legs appear at the top of each group.")
        df_open_sorted = _sorted_for_display(open_year)

        if df_open_sorted.empty:
            st.info("No open legs in this year.")
        else:
            st.write(f"**{len(df_open_sorted)} open legs**")
            # Render a compact row for each leg with a Close/Edit button
            for _, row in df_open_sorted.iterrows():
                cols = st.columns([0.9, 0.8, 1.1, 0.9, 0.9, 1.0, 1.0])
                leg_id = int(row["id"])
                group_id = int(row["group_id"]) if not pd.isna(row["group_id"]) else None

                with cols[0]:
                    if st.button("Close / edit", key=f"btn_close_{category_name}_{year}_{leg_id}"):
                        st.session_state["editing_leg_id"] = leg_id
                        st.session_state["editing_category"] = category_name
                        st.session_state["editing_year"] = year

                with cols[1]:
                    st.write(f"**G{group_id}**" if group_id is not None else "-")

                with cols[2]:
                    atype = row["asset_type"]
                    otype = row.get("option_type") or ""
                    st.write(f"{atype} {otype}".strip())

                with cols[3]:
                    st.write(f"{row['ticker']}")

                with cols[4]:
                    st.write(f"{row['leg_role']}")

                with cols[5]:
                    if pd.notna(row["entry_date"]):
                        st.write(f"Entry: {row['entry_date'].date()}")
                    else:
                        st.write("Entry: -")

                with cols[6]:
                    st.write(f"Qty: {row['contracts_or_shares']}")

            # "Popup" editor below the table if a leg is in editing state
            editing_id = st.session_state.get("editing_leg_id")
            editing_cat = st.session_state.get("editing_category")
            editing_year = st.session_state.get("editing_year")

            if editing_id is not None and editing_cat == category_name and editing_year == year:
                st.markdown("---")
                st.markdown(f"##### Close / edit leg #{editing_id}")

                # Reload from disk to avoid stale data
                df_all = load_data()
                match = df_all[df_all["id"] == editing_id]
                if match.empty:
                    st.warning("This leg no longer exists in the data.")
                else:
                    leg_row = match.iloc[0]

                    with st.form(f"edit_leg_form_{category_name}_{year}_{editing_id}"):
                        col1, col2 = st.columns(2)

                        with col1:
                            exit_date = st.date_input(
                                "Closing date",
                                value=dt.date.today(),
                                key=f"exit_date_{category_name}_{year}_{editing_id}",
                            )

                        auto_underlying = fetch_underlying_price(leg_row["ticker"])
                        if auto_underlying is not None:
                            st.caption(f"Auto-fetched underlying at close: {auto_underlying:.2f}")
                        else:
                            st.caption("Underlying price at close could not be fetched.")

                        with col2:
                            if leg_row["asset_type"] == "Stock":
                                close_price = st.number_input(
                                    "Closing price (stock)",
                                    value=float(auto_underlying) if auto_underlying is not None else 0.0,
                                    format="%.4f",
                                    key=f"close_price_stock_{category_name}_{year}_{editing_id}",
                                )
                                option_exit_price = None
                                exit_underlying_px = close_price
                            else:
                                close_price = st.number_input(
                                    "Closing price (option premium per share)",
                                    min_value=0.0,
                                    format="%.4f",
                                    key=f"close_price_opt_{category_name}_{year}_{editing_id}",
                                )
                                option_exit_price = close_price
                                exit_underlying_px = auto_underlying

                        updated_comments = st.text_area(
                            "Update comments / closing notes (optional)",
                            value=str(leg_row.get("comments") or ""),
                            height=60,
                            key=f"comments_close_{category_name}_{year}_{editing_id}",
                        )

                        submit_close = st.form_submit_button("Save & close leg")

                        if submit_close:
                            idx_list = df_all.index[df_all["id"] == editing_id].tolist()
                            if not idx_list:
                                st.error("Could not find this leg in the data anymore.")
                            else:
                                idx = idx_list[0]
                                df_all.at[idx, "exit_date"] = exit_date
                                df_all.at[idx, "exit_underlying_px"] = exit_underlying_px
                                df_all.at[idx, "option_exit_price"] = option_exit_price
                                df_all.at[idx, "is_open"] = False
                                df_all.at[idx, "comments"] = updated_comments
                                df_all.at[idx, "pnl"] = calculate_pnl(df_all.loc[idx])

                                save_data(df_all)
                                pnl_val = df_all.at[idx, "pnl"]
                                if pnl_val is not None:
                                    st.success(f"Leg #{editing_id} closed. PnL: {pnl_val:.2f}")
                                else:
                                    st.success("Leg closed, but PnL could not be calculated (missing prices).")

                                # Clear editing state so popup disappears on rerun
                                st.session_state["editing_leg_id"] = None
                                st.session_state["editing_category"] = None
                                st.session_state["editing_year"] = None

                            _trigger_rerun()

    
    # --- Closed legs tab ---
    with tab_closed:
        st.caption("Closed legs (this year).")
        display_trades_table(closed_year)

    # --- All legs tab ---
    with tab_all:
        st.caption("All legs (open & closed) for this year.")
        display_trades_table(df_year)


def render_category_page(category_name: str):
    st.title(category_name)

    df = load_data()
    df_cat = df[df["category"] == category_name].copy()

    if df_cat.empty or df_cat["entry_date"].dropna().empty:
        years = [dt.date.today().year]
    else:
        df_cat["entry_date"] = pd.to_datetime(df_cat["entry_date"], errors="coerce")
        df_cat = df_cat[~df_cat["entry_date"].isna()]
        if df_cat.empty:
            years = [dt.date.today().year]
        else:
            years = sorted(df_cat["entry_date"].dt.year.unique().tolist())

    tabs = st.tabs([str(y) for y in years] + ["Summary"])

    for i, year in enumerate(years):
        with tabs[i]:
            render_year_journal(category_name, year, df)

    with tabs[-1]:
        st.subheader("Summary (all years)")
        df = load_data()
        df_cat = df[df["category"] == category_name].copy()
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
                colB.metric("Trade groups", f"{overall['Trade Groups']}")
                colC.metric("Win rate", f"{overall['Win Rate'] * 100:.1f}%")
                colD.metric("Total legs", f"{overall['Total Legs']}")
                st.caption(
                    "Win rate is computed at the trade-group level (grouped by group_id); "
                    "long/short counts are at the leg level."
                )
