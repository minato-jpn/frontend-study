import {
  tableFeatures,
  columnFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  createFilteredRowModel,
  createSortedRowModel,
  createPaginatedRowModel,
  filterFn_includesString,
  sortFn_alphanumeric,
  sortFn_text,
  filterFn_equalsString,
  sortFn_datetime,
  sortFn_basic,
  aggregationFn_sum,
  rowAggregationFeature,
  createGroupedRowModel,
  filterFn_greaterThan,
} from "@tanstack/react-table";

const features = tableFeatures({
  columnFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    equalsString: filterFn_equalsString,
    greaterThan: filterFn_greaterThan,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
    datetime: sortFn_datetime,
    basic: sortFn_basic,
  },
  rowAggregationFeature,
  aggregationFns: { sum: aggregationFn_sum },
});

export default features;
