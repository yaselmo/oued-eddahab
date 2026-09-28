import type { Request, Response } from "express";

import {
  getCities,
  getInstitutionsByCity,
} from "./locations.service.js";

export async function listCities(
  _req: Request,
  res: Response,
) {
  try {
    const cities = await getCities();

    res.json({
      cities,
    });
  } catch (error) {
    console.error("Failed to fetch cities:", error);

    res.status(500).json({
      message: "Failed to fetch cities",
    });
  }
}

export async function listInstitutions(
  req: Request,
  res: Response,
) {
  try {
    const city =
      typeof req.query.city === "string"
        ? req.query.city.trim()
        : "";

    if (!city) {
      res.status(400).json({
        message: "City is required",
      });
      return;
    }

    const institutions = await getInstitutionsByCity(city);

    res.json({
      institutions,
    });
  } catch (error) {
    console.error("Failed to fetch institutions:", error);

    res.status(500).json({
      message: "Failed to fetch institutions",
    });
  }
}