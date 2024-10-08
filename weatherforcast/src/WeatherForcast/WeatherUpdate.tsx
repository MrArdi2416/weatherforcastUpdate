import React, { useEffect, useState } from "react";
import { AiOutlineDelete } from "react-icons/ai"; 

interface ForecastData {
  dt: number;
  main: {
    temp: number;
  };
  weather: { description: string; icon: string }[];
  dt_txt: string;
}

interface WeatherData {
  name: string;
  main: {
    temp: number;
    humidity: number;
  };
  weather: { description: string; icon: string }[];
  wind: { speed: number };
}

interface Coordinates {
  coord: {
    lat: number;
    lon: number;
  };
}

const WeatherUpdate = () => {
  const [city, setCity] = useState<string>("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [pastCities, setPastCities] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY;

  useEffect(() => {
    const savedCities = localStorage.getItem("pastCities");
    const savedWeatherData = localStorage.getItem("weatherData");

    if (savedCities) {
      setPastCities(JSON.parse(savedCities));
    }

    if (savedWeatherData) {
      const { weather, forecast } = JSON.parse(savedWeatherData);
      setWeatherData(weather);
      setForecastData(forecast);
    }
  }, []);

  const getCoordinates = async (city: string): Promise<Coordinates | null> => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`
      );
      if (!response.ok) {
        throw new Error("City not found");
      }
      const data: Coordinates = await response.json();
      return data;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      return null;
    }
  };

  const getWeatherData = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      if (!response.ok) {
        throw new Error("Error fetching weather data");
      }
      const data: WeatherData = await response.json();
      setWeatherData(data);
      return data;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  const getForecastData = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      if (!response.ok) {
        throw new Error("Error fetching forecast data");
      }
      const data = await response.json();

      // Process forecast data to get one entry per day
      const filteredForecast: ForecastData[] = [];
      const seenDates = new Set();

      data.list.forEach((entry: ForecastData) => {
        const date = new Date(entry.dt * 1000).toLocaleDateString();

        if (!seenDates.has(date)) {
          seenDates.add(date);
          filteredForecast.push(entry);
        }
      });

      setForecastData(filteredForecast.slice(0, 5)); // Ensure only 5 entries are displayed
      return filteredForecast.slice(0, 5); // Return the filtered forecast
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  const handleSearch = async () => {
    if (city.trim() === "") return;

    setError(null);
    setLoading(true);

    const coordinates = await getCoordinates(city);

    if (coordinates) {
      const {
        coord: { lat, lon },
      } = coordinates;

      const weather = await getWeatherData(lat, lon);
      const forecast = await getForecastData(lat, lon);

      if (weather && forecast) {
        const newPastCities = [...new Set([...pastCities, city])]; // Prevent duplicates
        setPastCities(newPastCities);

        // Save to localStorage
        localStorage.setItem("pastCities", JSON.stringify(newPastCities));
        localStorage.setItem(
          "weatherData",
          JSON.stringify({ weather, forecast })
        );
      }
    } else {
      setError("City not found");
    }

    setLoading(false);
    setCity("");
  };

  const handlePastCityClick = async (pastCity: string) => {
    setCity(pastCity);
    const coordinates = await getCoordinates(pastCity);
    if (coordinates) {
      const {
        coord: { lat, lon },
      } = coordinates;
      await getWeatherData(lat, lon);
      await getForecastData(lat, lon);
    }
  };

  const handleDeleteCity = (cityToDelete: string) => {
    const updatedCities = pastCities.filter((city) => city !== cityToDelete);
    setPastCities(updatedCities);
    localStorage.setItem("pastCities", JSON.stringify(updatedCities));
  };

  const handleClearData = () => {
    setPastCities([]);
    setWeatherData(null);
    setForecastData([]);
    localStorage.removeItem("pastCities");
    localStorage.removeItem("weatherData");
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
    document.body.classList.toggle("dark", !isDarkMode);
  };

  return (
    <>
      <div
        className={`flex flex-col lg:flex-row p-8 min-h-screen ${
          isDarkMode ? "bg-gray-800 text-black" : "bg-white text-black"
        }`}
      >
        {/* Aside: Past Searches */}
        <aside className="lg:w-1/4 p-4 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-lg">
          <h2 className="text-2xl md:text-3xl pl-2 my-2 border-l-4 bg-clip-text text-transparent font-bold bg-gradient-to-r from-indigo-500 to-teal-500">
            Previous City's Weather
          </h2>
          <div className="grid grid-cols-1 gap-4 mt-8">
            {pastCities.map((pastCity, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md cursor-pointer"
              >
                <div
                  onClick={() => handlePastCityClick(pastCity)}
                  className="text-lg font-medium"
                >
                  {pastCity}
                </div>
                <AiOutlineDelete
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                  onClick={() => handleDeleteCity(pastCity)}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleClearData}
            className="mt-4 w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition"
          >
            Clear Data
          </button>
        </aside>

        {/* Main Content */}
        <div className="flex flex-col lg:w-3/4 lg:pl-8">
          <div className="flex justify-between">
            <div className="flex">
              <h1 className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-teal-500 text-5xl  pl-2 font-black">
                Weather Dashboard
              </h1>
            </div>

            <div className="flex items-center mb-4">
              <button
                onClick={toggleDarkMode}
                className="h-12 w-12 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg
                  className="fill-violet-700 block dark:hidden"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
                <svg
                  className="fill-yellow-500 hidden dark:block"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center w-full max-w-md mb-4 mt-8">
            <input
              type="text"
              className={`w-full p-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 ${
                isDarkMode
                  ? "bg-gray-600 border-gray-400"
                  : "bg-white border-gray-300"
              } focus:ring-blue-500`}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 transition"
            >
              Search
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center w-full h-[100vh] text-gray-900 dark:text-gray-100 dark:bg-gray-950">
              <div>
                <h1 className="text-xl md:text-7xl font-bold flex items-center">
                  L
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    stroke-width="0"
                    viewBox="0 0 24 24"
                    className="animate-spin"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM13.6695 15.9999H10.3295L8.95053 17.8969L9.5044 19.6031C10.2897 19.8607 11.1286 20 12 20C12.8714 20 13.7103 19.8607 14.4956 19.6031L15.0485 17.8969L13.6695 15.9999ZM5.29354 10.8719L4.00222 11.8095L4 12C4 13.7297 4.54894 15.3312 5.4821 16.6397L7.39254 16.6399L8.71453 14.8199L7.68654 11.6499L5.29354 10.8719ZM18.7055 10.8719L16.3125 11.6499L15.2845 14.8199L16.6065 16.6399L18.5179 16.6397C19.4511 15.3312 20 13.7297 20 12L19.997 11.81L18.7055 10.8719ZM12 9.536L9.656 11.238L10.552 14H13.447L14.343 11.238L12 9.536ZM14.2914 4.33299L12.9995 5.27293V7.78993L15.6935 9.74693L17.9325 9.01993L18.4867 7.3168C17.467 5.90685 15.9988 4.84254 14.2914 4.33299ZM9.70757 4.33329C8.00021 4.84307 6.53216 5.90762 5.51261 7.31778L6.06653 9.01993L8.30554 9.74693L10.9995 7.78993V5.27293L9.70757 4.33329Z"></path>
                  </svg>{" "}
                  ading . . .
                </h1>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 mt-4">{error}</p>}

          {/* Weather Data */}
          {weatherData && (
            <div className="mt-8  max-w-md bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold dark:text-black">{weatherData.name}</h3>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-lg font-medium">
                    Temperature: {weatherData.main.temp}°C
                  </p>
                  <p>Humidity: {weatherData.main.humidity}%</p>
                  <p>Wind Speed: {weatherData.wind.speed} m/s</p>
                  <p>Condition: {weatherData.weather[0].description}</p>
                </div>
                <img
                  src={`http://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png`}
                  alt="weather icon"
                  className="w-20 h-20"
                />
              </div>
            </div>
          )}

          {/* Forecast Data */}
          {forecastData && (
            <div className="mt-8 max-w-5xl bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                5-Day Forecast
              </h3>
              <div className="flex flex-col md:flex-row sm:flex-row gap-4">
                {forecastData.map((forecast) => (
                  <div
                    key={forecast.dt}
                    className="bg-blue-100 p-6 rounded-md text-center"
                  >
                    <p className="font-bold text-gray-700">
                      {new Date(forecast.dt_txt).toLocaleDateString()}  
                    </p>
                    <img
                      src={`http://openweathermap.org/img/wn/${forecast.weather[0].icon}.png`}
                      alt="weather icon"
                      className="w-16 h-16 mx-auto"
                    />
                    <p className="text-lg font-medium">
                      Temp: {forecast.main.temp}°C
                    </p>
                    <p>{forecast.weather[0].description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WeatherUpdate;
