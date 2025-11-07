import streamlit as st

from journal_core import (
    load_data,
    display_trades_table,
    compute_portfolio_summary,
    CATEGORY_BREAKOUT,
    CATEGORY_EQUITY_INDEX,
    CATEGORY_COMMODITY,
    CATEGORY_INCOME,
)

st.set_page_config(page_title="Portfolio Summary", layout="wide")

st.title("📊 Portfolio Summary")

df = load_data()

if df.empty or df["entry_date"].dropna().empty:
    st.info("No trades recorded yet. Go to one of the strategy pages to start journaling trades.")
else:
    st.markdown("### Overall Trade Log")
    display_trades_table(df)

    st.markdown("### Yearly & Category Breakdown")

    by_cat_year_df, by_year_df, overall = compute_portfolio_summary(df)

    if by_cat_year_df.empty:
        st.info("No closed trades with PnL yet to summarize.")
    else:
        st.subheader("By Year & Category")
        st.dataframe(by_cat_year_df, use_container_width=True)

        st.subheader("By Year (All Categories)")
        st.dataframe(by_year_df, use_container_width=True)

        st.subheader("Overall Portfolio Metrics")
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total PnL", f"{overall['Total PnL']:.2f}")
        col2.metric("Trade Groups", f"{overall['Trade Groups']}")
        win_rate_pct = overall["Win Rate"] * 100
        col3.metric("Win Rate", f"{win_rate_pct:.1f}%")
        col4.metric("Total Legs", f"{overall['Total Legs']}")
        st.caption("Metrics are based on closed trade groups with a calculated PnL (legs with missing prices are excluded).")

st.markdown("----")
st.markdown("Use the sidebar **Pages** navigation to switch to:")
st.markdown(f"- **{CATEGORY_BREAKOUT}**")
st.markdown(f"- **{CATEGORY_EQUITY_INDEX}**")
st.markdown(f"- **{CATEGORY_COMMODITY}**")
st.markdown(f"- **{CATEGORY_INCOME}**")
