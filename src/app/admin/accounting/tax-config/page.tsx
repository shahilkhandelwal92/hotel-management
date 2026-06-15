"use client"

import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function TaxConfigPage() {
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        financialYear: "",
        taxType: "GST",
        taxRegistrationNumber: "",
        companyState: "Maharashtra",
        roomTaxPct: 0,
        restaurantTaxPct: 0,
        barTaxPct: 0,
        amenityTaxPct: 0,
        tdsPct: 0,
        isTaxApplicable: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const res = await fetch("/api/tax-config");
            const data = await res.json();
            if (res.ok) {
                setConfigs(data);
            }
        } catch (error) {
            console.error("Error fetching configs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        let parsedValue: any = value;
        if (type === 'number') parsedValue = parseFloat(value) || 0;
        if (type === 'checkbox') parsedValue = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: parsedValue
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const res = await fetch("/api/tax-config", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok) {
                setSuccessMessage("Tax configuration saved successfully!");
                fetchConfigs();
            } else {
                setErrorMessage(data.error || "Failed to save.");
            }
        } catch (_error) {
            setErrorMessage("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-calculate financial year helper
    const setCurrentFinancialYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const startYear = now.getMonth() < 3 ? year - 1 : year;
        setFormData(prev => ({ ...prev, financialYear: `${startYear}-${startYear + 1}` }));
    }

    if (loading) return <div className="p-8"><p className="text-gray-500 animate-pulse">Loading tax configurations...</p></div>;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Tax Configurations</h1>
                    <p className="text-gray-500 mt-1">Manage global tax percentages per financial year</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">New Configuration</h2>

                    {successMessage && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-200">{successMessage}</div>}
                    {errorMessage && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{errorMessage}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                            <div className="flex gap-2">
                                <input required type="text" name="financialYear" value={formData.financialYear} onChange={handleInputChange} placeholder="YYYY-YYYY" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                <button type="button" onClick={setCurrentFinancialYear} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">Auto</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type</label>
                                <select name="taxType" value={formData.taxType} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                                    <option value="GST">GST</option>
                                    <option value="VAT">VAT</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registration No.</label>
                                <input type="text" name="taxRegistrationNumber" value={formData.taxRegistrationNumber} onChange={handleInputChange} placeholder="GSTIN" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company State</label>
                            <input required type="text" name="companyState" value={formData.companyState} onChange={handleInputChange} placeholder="e.g. Maharashtra" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            <p className="text-xs text-gray-500 mt-1">Used to determine CGST/SGST vs IGST billing.</p>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-800 mb-3">Tax Rates (%)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Rooms</label>
                                    <input type="number" step="0.01" name="roomTaxPct" value={formData.roomTaxPct} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Restaurant</label>
                                    <input type="number" step="0.01" name="restaurantTaxPct" value={formData.restaurantTaxPct} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Bar</label>
                                    <input type="number" step="0.01" name="barTaxPct" value={formData.barTaxPct} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Amenities</label>
                                    <input type="number" step="0.01" name="amenityTaxPct" value={formData.amenityTaxPct} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">TDS Included</label>
                                    <input type="number" step="0.01" name="tdsPct" value={formData.tdsPct} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="isTaxApplicable" checked={formData.isTaxApplicable} onChange={handleInputChange} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                <span className="text-sm font-medium text-gray-700">Tax Applicable This Year</span>
                            </label>
                        </div>

                        <button disabled={isSubmitting} type="submit" className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                            {isSubmitting ? "Saving..." : "Save Configuration"}
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    {configs.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No configurations yet</h3>
                            <p className="text-gray-500 mt-1 max-w-sm">Create your first tax configuration to enable automated tax calculations for your bills.</p>
                        </div>
                    ) : (
                        configs.map((config) => (
                            <div key={config.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg">
                                            {config.financialYear.split('-')[0].slice(-2)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Financial Year {config.financialYear}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                                    {config.taxType}
                                                </span>
                                                <span className="text-sm text-gray-500">{config.companyState}</span>
                                                {!config.isTaxApplicable && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">EXEMPT</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-gray-500">
                                        Last updated: {format(new Date(config.updatedAt), 'MMM dd, yyyy')}
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-4 pt-4 border-t border-gray-50">
                                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                                        <div className="text-xs text-gray-500 font-medium mb-1">Rooms</div>
                                        <div className="font-bold text-gray-900">{config.roomTaxPct}%</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                                        <div className="text-xs text-gray-500 font-medium mb-1">Restaurant</div>
                                        <div className="font-bold text-gray-900">{config.restaurantTaxPct}%</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                                        <div className="text-xs text-gray-500 font-medium mb-1">Bar</div>
                                        <div className="font-bold text-gray-900">{config.barTaxPct}%</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                                        <div className="text-xs text-gray-500 font-medium mb-1">Amenities</div>
                                        <div className="font-bold text-gray-900">{config.amenityTaxPct}%</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                                        <div className="text-xs text-gray-500 font-medium mb-1">TDS</div>
                                        <div className="font-bold text-gray-900">{config.tdsPct}%</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
