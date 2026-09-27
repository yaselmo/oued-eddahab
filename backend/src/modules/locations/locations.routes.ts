import { Router } from "express";

import {
  listCities,
  listInstitutions,
} from "./locations.controller.js";

const router = Router();

router.get("/cities", listCities);
router.get("/institutions", listInstitutions);

export default router;