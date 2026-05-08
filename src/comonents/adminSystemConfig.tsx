import { useState, type ChangeEvent } from "react";
import AdminCard from "./adminCard";
import Input from "./inputField";
import Label from "./label";
import { MdMyLocation, MdSave, MdSettings } from "react-icons/md";
import { useAuth } from "../store/authStore";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { getLocation } from "../lib/utils";
import QRCode from "./qrCode";

type FormDataType = {
    name: string;
    lat: number | undefined;
    lng: number | undefined;
    radius: number | undefined;
}

type UiStateType = {
    saving: boolean;
    gettingLocation: boolean;
    locationGotten: boolean;
}

function AdminSystemConfigScreen() {
    const { setAdmin, admin } = useAuth();

    const [formData, setFormData] = useState<FormDataType>({
        name: admin?.lgaDetails?.name ?? '',
        lat: admin?.lgaDetails?.latitude ?? undefined,
        lng: admin?.lgaDetails?.longitude ?? undefined,
        radius: admin?.lgaDetails?.radius ?? undefined,
    });

    const [uiState, setUiState] = useState<UiStateType>({
        saving: false,
        gettingLocation: false,
        locationGotten: false,
    });

    const setUI = (patch: Partial<UiStateType>) =>
        setUiState(prev => ({ ...prev, ...patch }));

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    const getLocationComp = async () => {
        setUI({ gettingLocation: true });
        try {
            const location = await getLocation();
            if (location) {
                if ('denied' in location) {
                    toast.error('Location permission denied. Allow permission and refresh the page');
                    setUI({ gettingLocation: false });
                    return;
                }

                const { latitude, longitude } = location;
                setFormData(prev => ({
                    ...prev,
                    lat: latitude,
                    lng: longitude,
                }));
                setUI({ gettingLocation: false, locationGotten: true });
                toast.success('Location retrieved successfully.');
                setTimeout(() => setUI({ locationGotten: false }), 5000);
            } else {
                toast.error('Failed to retrieve location. Please try again.');
                setUI({ gettingLocation: false });
            }

        } catch (error) {
            setUI({ gettingLocation: false });
            toast.error('Failed to retrieve location. Please try again.');
            console.error(error);
        }
    }

    // const useCurrentLocation = () => {
    //     if (!navigator.geolocation) {
    //         toast.error('Location permission required. Allow permission and refresh the page');
    //         return;
    //     }
    //     setUI({ gettingLocation: true });
    //     navigator.geolocation.getCurrentPosition(
    //         (pos) => {
    //             setFormData(prev => ({
    //                 ...prev,
    //                 lat: parseFloat(pos.coords.latitude.toFixed(6)),
    //                 lng: parseFloat(pos.coords.longitude.toFixed(6)),
    //             }));
    //             setUI({ gettingLocation: false, locationGotten: true });
    //             toast.success('Location retrieved successfully.');
    //             setTimeout(() => setUI({ locationGotten: false }), 5000);
    //         },
    //         (error) => {
    //             setUI({ gettingLocation: false });
    //             toast.error('Location permission denied. Allow permission and refresh the page');
    //             console.error(error);
    //         }
    //     );
    // };

    const saveConfig = async () => {
        const { name, lat, lng, radius } = formData;

        if (!name?.trim() || !lat || !lng) {
            toast.error('All fields are required.');
            return;
        }
        if (!radius || radius < 50 || radius > 1000) {
            toast.error('Radius must be between 50 m and 1000 m.');
            return;
        }
          // Parse here — handles both manual input (string) and getLocation (number)
    const parsedLat = parseFloat(String(lat));
    const parsedLng = parseFloat(String(lng));
    const parsedRadius = Number(radius);

        setUI({ saving: true });
        try {
            const res = await api.post('/admin/update-lga', {
                radius:parsedRadius,
                latitude: parsedLat,
                longitude: parsedLng,
                name,
            });
            if (res.data.success) {
                const lga = res.data.lga;
                setAdmin({
                    ...admin!,
                    lgaDetails: {
                        name: lga.name,
                        latitude: lga.latitude,
                        longitude: lga.longitude,
                        radius: lga.radius,
                        updatedAt: lga.updatedAt,
                        checkInSlug: lga.checkInSlug,
                    }
                });
                toast.success('Location settings saved successfully.');
            }
        } catch (error) {
            toast.error('Failed to save location settings. Please try again.');
            console.error(error);
        } finally {
            setUI({ saving: false });
        }
    };

    return (
        <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5 h-fit">
            <QRCode />
            <AdminCard
                icon={<MdSettings className="text-lg" />}
                title="System Configuration"
                subtitle="Set the LGA's geofence — corpers outside this radius cannot check in."
            >
                <div className="flex flex-col gap-3">
                    <div>
                        <Label>LGA Name</Label>
                        <Input
                            placeholder="e.g. Ikeja"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Latitude</Label>
                            <Input
                                placeholder="e.g. 6.6018"
                                name="lat"
                                value={formData.lat}
                                onChange={handleChange}
                                
                            />
                        </div>
                        <div>
                            <Label>Longitude</Label>
                            <Input
                                placeholder="e.g. 3.3515"
                                name="lng"
                                value={formData.lng}
                                onChange={handleChange}
                                
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Geofence Radius (meters)</Label>
                        <Input
                            type="number"
                            min={50}
                            max={1000}
                            name="radius"
                            value={formData.radius}
                            onChange={handleChange}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Between 50 m and 1000 m</p>
                    </div>

                    <button
                        onClick={getLocationComp}
                        disabled={uiState.gettingLocation}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-semibold hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uiState.gettingLocation ? (
                            <>
                                <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                Getting location...
                            </>
                        ) : (
                            <>
                                <MdMyLocation className="text-[#2b7234] text-base" />
                                {formData.lat && formData.lng ? 'Update Location' : 'Get Location'}
                            </>
                        )}
                    </button>

                    <button
                        onClick={saveConfig}
                        disabled={uiState.saving}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2b7234] hover:bg-[#153619] text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uiState.saving ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <MdSave className="text-base" />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </AdminCard>
        </main>
    );
}

export default AdminSystemConfigScreen;
