import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    FlatList,
    TouchableOpacity,
    Linking,
    ActivityIndicator,
    Alert,
    ListRenderItem,
} from 'react-native';

interface Offer {
    provider: string;
    discount: string;
    deep_link: string;
    last_updated: string;
}

interface Restaurant {
    _id: string;
    name: string;
    location?: {
        lat: number;
        lng: number;
    };
    cached_offers: Offer[];
}

// Helper function to handle deep linking
const openDeepLink = async (url: string, fallbackUrl: string) => {
    try {
        const supported = await Linking.canOpenURL(url);

        if (supported) {
            await Linking.openURL(url);
        } else {
            console.log("Deep link not supported, opening fallback:", fallbackUrl);
            if (fallbackUrl) {
                await Linking.openURL(fallbackUrl);
            } else {
                Alert.alert("Error", "Cannot open this offer.");
            }
        }
    } catch (error) {
        console.error("An error occurred", error);
        if (fallbackUrl) {
            try {
                await Linking.openURL(fallbackUrl);
            } catch (err) {
                Alert.alert("Error", "Could not open link.");
            }
        }
    }
};

export default function HomeScreen() {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [city, setCity] = useState<string>('Bangalore'); // Default city for now
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Replace with your machine's IP if running on device/emulator (e.g. 'http://192.168.1.5:5000')
    // Android Emulator uses 'http://10.0.2.2:5000'
    const API_URL = 'http://localhost:5000/api/offers';

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setRestaurants([]); // Clear previous results

        try {
            // In a real app, you'd get lat/lng from device location
            const queryParams = new URLSearchParams({
                name: searchQuery,
                city: city,
                lat: '12.9716',
                lng: '77.5946'
            });

            const response = await fetch(`${API_URL}?${queryParams.toString()}`);

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            // The backend currently returns a single object if found/scraped, 
            // or we might want to adjust backend to return an array of matches.
            // Based on current backend implementation (findOne), it returns one object.
            // We wrap it in array for FlatList.
            if (data) {
                setRestaurants([data]);
            } else {
                setRestaurants([]);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch offers. Make sure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const renderItem: ListRenderItem<Restaurant> = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.restaurantName}>{item.name}</Text>
            <View style={styles.badgesContainer}>
                {item.cached_offers && item.cached_offers.map((offer: Offer, index: number) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.badge, { backgroundColor: getProviderColor(offer.provider) }]}
                        onPress={() => openDeepLink(offer.deep_link, offer.deep_link)} // Scraper puts web url in deep_link currently
                    >
                        <Text style={styles.badgeText}>
                            {offer.provider}: {offer.discount}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const getProviderColor = (provider: string) => {
        const p = provider ? provider.toLowerCase() : '';
        if (p.includes('magicpin')) return '#D53F8C'; // Pink
        if (p.includes('zomato')) return '#E23744'; // Red
        if (p.includes('swiggy')) return '#FC8019'; // Orange
        return '#555';
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter City (Default: Bangalore)"
                    value={city}
                    onChangeText={setCity}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Search Restaurant..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                />
                <TouchableOpacity style={styles.button} onPress={handleSearch}>
                    <Text style={styles.buttonText}>Search</Text>
                </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />}

            <FlatList
                data={restaurants}
                keyExtractor={(item: Restaurant) => item._id || Math.random().toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No results found.</Text> : null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingTop: 10,
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
        elevation: 2,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    restaurantName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    badge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#888',
    }
});
