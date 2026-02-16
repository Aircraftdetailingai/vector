"use client";
import { useState, useRef, useEffect } from "react";

export default function CustomerSelector({
  customerMode,
  onModeChange,
  selectedCustomer,
  onSelect,
  onClear,
  newCustomerFields,
  onFieldChange,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Load recent customers when switching to existing mode
  useEffect(() => {
    if (customerMode === "existing" && !selectedCustomer) {
      searchCustomers("");
    }
  }, [customerMode]);

  const searchCustomers = async (query) => {
    setSearching(true);
    try {
      const token = localStorage.getItem("vector_token");
      const params = new URLSearchParams({ limit: "10" });
      if (query) params.set("q", query);

      const res = await fetch(`/api/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.customers || []);
      }
    } catch (err) {
      console.error("Customer search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setDropdownOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchCustomers(value);
    }, 300);
  };

  const handleSelect = (customer) => {
    onSelect(customer);
    setDropdownOpen(false);
    setSearchQuery("");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mb-4">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => {
            onModeChange("existing");
            onClear();
          }}
          className={`flex-1 py-2 px-3 rounded text-sm font-medium border transition-colors ${
            customerMode === "existing"
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Select Existing
        </button>
        <button
          type="button"
          onClick={() => {
            onModeChange("new");
            onClear();
          }}
          className={`flex-1 py-2 px-3 rounded text-sm font-medium border transition-colors ${
            customerMode === "new"
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          }`}
        >
          New Customer
        </button>
      </div>

      {/* Existing Customer Mode */}
      {customerMode === "existing" && (
        <div>
          {selectedCustomer ? (
            // Selected customer chip
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedCustomer.name}
                    {selectedCustomer.company_name && (
                      <span className="text-gray-500 font-normal ml-2">
                        {selectedCustomer.company_name}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                  )}
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    {selectedCustomer.quote_count > 0 && (
                      <span>{selectedCustomer.quote_count} previous quote{selectedCustomer.quote_count !== 1 ? "s" : ""}</span>
                    )}
                    {selectedCustomer.last_service_date && (
                      <span>Last service: {formatDate(selectedCustomer.last_service_date)}</span>
                    )}
                    {!selectedCustomer.quote_count && (
                      <span>New customer</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClear}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none"
                >
                  &times;
                </button>
              </div>
            </div>
          ) : (
            // Search input + dropdown
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search by name, email, or company..."
                className="w-full border rounded px-3 py-2 pr-8"
              />
              {searching && (
                <span className="absolute right-3 top-2.5 text-gray-400 text-sm">...</span>
              )}

              {dropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-gray-500 text-sm text-center">
                      {searching ? "Searching..." : searchQuery ? "No customers found" : "No existing customers"}
                    </div>
                  ) : (
                    searchResults.map((customer) => (
                      <div
                        key={customer.id || customer.email}
                        onClick={() => handleSelect(customer)}
                        className="p-3 hover:bg-amber-50 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {customer.name}
                              {customer.company_name && (
                                <span className="text-gray-400 font-normal text-sm ml-2">
                                  {customer.company_name}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                          <div className="text-right text-xs text-gray-400">
                            {customer.quote_count > 0 ? (
                              <>
                                <span>{customer.quote_count} quote{customer.quote_count !== 1 ? "s" : ""}</span>
                                {customer.last_service_date && (
                                  <p>Last: {formatDate(customer.last_service_date)}</p>
                                )}
                              </>
                            ) : (
                              <span>No quotes</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Switch to new customer */}
                  <div
                    onClick={() => {
                      onModeChange("new");
                      onClear();
                      setDropdownOpen(false);
                    }}
                    className="p-3 text-center text-amber-600 hover:bg-amber-50 cursor-pointer border-t font-medium text-sm"
                  >
                    + Add New Customer
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Customer Mode */}
      {customerMode === "new" && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={newCustomerFields.companyName || ""}
              onChange={(e) => onFieldChange({ companyName: e.target.value })}
              placeholder="ABC Aviation"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newCustomerFields.name || ""}
              onChange={(e) => onFieldChange({ name: e.target.value })}
              placeholder="John Smith"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={newCustomerFields.email || ""}
              onChange={(e) => onFieldChange({ email: e.target.value })}
              placeholder="john@example.com"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={newCustomerFields.phone || ""}
              onChange={(e) => onFieldChange({ phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}
